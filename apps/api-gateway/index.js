const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const authService = require('./src/services/auth.service');
const resultsService = require('./src/services/results.service');
const aggregator = require('./src/services/aggregator.service');
const reportService = require('./src/services/report.service');
const identityService = require('./src/services/identity.service');
const alertService = require('./src/services/alert.service');
const { protect } = require('./src/middleware/auth.middleware');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
app.disable('etag');
const PORT = process.env.PORT || 3001;
const INGEST_SERVICE_URL = process.env.INGEST_SERVICE_URL || 'http://localhost:8001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

/**
 * Helper to create a Supabase client authorized with the user's JWT
 */
const getAuthorizedClient = (token) => {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};

const upload = multer({ storage: multer.memoryStorage() });

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false // Disable CSP for simpler debugging during development
}));

app.use(cors({
    origin: (origin, callback) => {
        // Allow localhost, trycloudflare, and any github.io subdomains
        if (!origin || origin.endsWith('.github.io') || origin.includes('localhost') || origin.includes('trycloudflare.com')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.json({ status: 'up', timestamp: new Date(), version: '1.3.0' });
});

const jobCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Evict old jobs from memory cache to prevent leakage
 */
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of jobCache.entries()) {
        if (data.timestamp && (now - data.timestamp > CACHE_TTL)) {
            jobCache.delete(id);
        }
    }
}, 60 * 1000);

/**
 * CORE ANALYSIS ROUTES
 */
app.post('/v1/analyze', protect, upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    const { media_type = 'image' } = req.body;
    const file = req.file;
    const userId = req.user.id;

    if (!file && !req.body.url) return res.status(400).json({ error: 'No media file or URL provided' });

    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        const client = getAuthorizedClient(token);

        let jobData;
        let filePath = '';

        // 1. Ingest
        if (file) {
            const form = new FormData();
            form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
            const response = await axios.post(`${INGEST_SERVICE_URL}/ingest`, form, { headers: { ...form.getHeaders() } });
            jobData = response.data;
            filePath = jobData.s3_key;

            // Background DB Init
            resultsService.createInvestigation(userId, jobData, client).catch(e => console.error('DB Async Init Fail:', e.message));
        } else {
            jobData = { job_id: `url_${Date.now()}`, status: 'received' };
        }

        // Initialize Memory Cache for 0ms polling overhead
        jobCache.set(jobData.job_id, {
            status: 'processing',
            message: 'Forensic engine engaged.',
            timestamp: Date.now()
        });

        // 3. Return 202 Instant
        res.status(202).json({
            data: {
                id: jobData.job_id,
                type: 'job',
                attributes: { status: 'processing', message: 'Forensic engine engaged.' }
            }
        });

        // 4. Background Processing
        (async () => {
            try {
                const ML_ORCHESTRATOR_URL = process.env.ML_ORCHESTRATOR_URL || 'http://localhost:8002';
                console.log(`[GATEWAY] Dispatching to Orchestrator: ${jobData.job_id}`);

                const mlResponse = await axios.post(`${ML_ORCHESTRATOR_URL}/analyze`, {
                    job_id: jobData.job_id,
                    file_path: filePath,
                    media_type: media_type
                });

                if (mlResponse.data.status === 'failed') {
                    throw new Error(mlResponse.data.error || 'Orchestrator internal failure');
                }

                const layerScores = mlResponse.data.layers;
                const resultStats = aggregator.calculateTrustScore(media_type, layerScores);

                console.log(`[GATEWAY] Processing complete for ${jobData.job_id}. Trust Score: ${resultStats.trust_score}`);

                // Update Cache immediately
                jobCache.set(jobData.job_id, {
                    status: 'complete',
                    trust_score: resultStats.trust_score,
                    verdict: resultStats.verdict,
                    layers: layerScores,
                    timestamp: Date.now()
                });

                // Silent Persistence
                await resultsService.saveResult(jobData.job_id, {
                    ...resultStats,
                    layers: layerScores
                }, client).catch(e => console.error(`[DATABASE] Persistence Fail for ${jobData.job_id}:`, e.message));

            } catch (bgError) {
                const failureMsg = bgError.response?.data?.error || bgError.message;
                console.error(`[GATEWAY] Background worker CRITICAL error [${jobData.job_id}]:`, failureMsg);

                jobCache.set(jobData.job_id, {
                    status: 'failed',
                    timestamp: Date.now(),
                    error: `Scanning Failure: ${failureMsg}`
                });
            }
        })();

    } catch (err) {
        console.error('Gateway Error:', err.message);
        res.status(500).json({ error: 'System busy. Retry in a few seconds.' });
    }
});

app.get('/v1/jobs/:id', protect, async (req, res) => {
    const jobId = req.params.id;

    // Fast-path: Memory Cache check first
    if (jobCache.has(jobId)) {
        return res.json({
            data: {
                id: jobId,
                type: 'job',
                attributes: jobCache.get(jobId)
            }
        });
    }

    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        const client = getAuthorizedClient(token);

        const result = await resultsService.getResultByJobId(jobId, client);
        if (!result) return res.status(404).json({ error: 'Investigation record not found' });

        res.json({
            data: {
                id: result.id,
                type: 'job',
                attributes: {
                    status: result.status,
                    trust_score: result.overall_trust_score,
                    layers: result.layers || result.forensic_results
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal bridge failure' });
    }
});

app.get('/v1/history', protect, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        const client = getAuthorizedClient(token);

        const history = await resultsService.getUserHistory(req.user.id, 10, client);
        res.json({ data: history });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.get('/v1/jobs/:id/report', async (req, res) => {
    try {
        const pdfBuffer = await reportService.generateReport(req.params.id);
        if (!pdfBuffer) return res.status(404).json({ error: 'Report not available' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=VERIDARA_Report_${req.params.id}.pdf`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Report Download Error:', err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => console.log(`API Gateway v1.1 running on http://localhost:${PORT} (Supabase Cloud Mode)`));
}

module.exports = app;
