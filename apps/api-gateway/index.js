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

app.use(helmet());
app.use(cors({
    origin: ['https://devashishsoan.github.io', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

/**
 * CORE ANALYSIS ROUTES
 */
app.post('/v1/analyze', protect, upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    const { media_type = 'image' } = req.body;
    const file = req.file;
    const userId = req.user.id;

    if (!file && !req.body.url) return res.status(400).json({ error: 'No media file or URL provided' });

    console.log(`[${new Date().toISOString()}] Analysis request received from user ${userId}`);

    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        const client = getAuthorizedClient(token);

        let jobData;
        let filePath = '';

        // 1. Ingest (Must be sync as it provides the job_id)
        if (file) {
            const ingestStart = Date.now();
            const form = new FormData();
            form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
            const response = await axios.post(`${INGEST_SERVICE_URL}/ingest`, form, { headers: { ...form.getHeaders() } });
            jobData = response.data;
            filePath = jobData.s3_key;
            console.log(`[GATEWAY] Ingest completed in ${Date.now() - ingestStart}ms. JobID: ${jobData.job_id}`);

            // 2. Create initial DB record
            await resultsService.createInvestigation(userId, jobData, client);
        } else {
            jobData = { job_id: `url_${Date.now()}`, status: 'received' };
        }

        // 3. Return 202 Accepted IMMEDIATELY to prevent frontend timeout
        res.status(202).json({
            data: {
                id: jobData.job_id,
                type: 'job',
                attributes: {
                    status: 'processing',
                    message: 'Forensic analysis pipeline initialized. Polling required.'
                }
            }
        });

        // 4. Background Processing (Not-awaited)
        (async () => {
            try {
                const mlStart = Date.now();
                const ML_ORCHESTRATOR_URL = process.env.ML_ORCHESTRATOR_URL || 'http://localhost:8002';
                console.log(`[GATEWAY] Triggering ML Orchestrator for ${jobData.job_id}...`);

                const mlResponse = await axios.post(`${ML_ORCHESTRATOR_URL}/analyze`, {
                    job_id: jobData.job_id,
                    file_path: filePath,
                    media_type: media_type
                });
                console.log(`[GATEWAY] ML Analysis for ${jobData.job_id} finished in ${Date.now() - mlStart}ms`);

                const layerScores = mlResponse.data.layers;
                const resultStats = aggregator.calculateTrustScore(media_type, layerScores);

                // 5. Save final result in background
                const dbStart = Date.now();
                await resultsService.saveResult(jobData.job_id, {
                    ...resultStats,
                    layers: layerScores
                }, client);
                console.log(`[GATEWAY] Final results saved for ${jobData.job_id} in ${Date.now() - dbStart}ms. Total flow: ${Date.now() - startTime}ms`);

            } catch (bgError) {
                console.error(`[GATEWAY] Background Analysis Error for ${jobData.job_id}:`, bgError.message);
                // Update job status to error if possible
                try {
                    await client.from('analysis_jobs').update({ status: 'failed' }).eq('id', jobData.job_id);
                } catch (dbErr) {
                    console.error('Failed to update job status to error:', dbErr.message);
                }
            }
        })();

    } catch (err) {
        console.error('Analysis Initiation Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to initiate analysis: ' + (err.response?.data?.detail || err.message) });
    }
});

app.get('/v1/jobs/:id', protect, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        const client = getAuthorizedClient(token);

        const result = await resultsService.getResultByJobId(req.params.id, client);
        if (!result) return res.status(404).json({ error: 'Job result not found' });

        res.json({
            data: {
                id: result.id,
                type: 'job',
                attributes: {
                    status: result.status,
                    trust_score: result.overall_trust_score,
                    layers: result.layers || result.forensic_results,
                    completed_at: result.updated_at
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
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
