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
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

/**
 * CORE ANALYSIS ROUTES
 */
app.post('/v1/analyze', protect, upload.single('file'), async (req, res) => {
    const { media_type = 'image' } = req.body;
    const file = req.file;
    const userId = req.user.id;

    if (!file && !req.body.url) return res.status(400).json({ error: 'No media file or URL provided' });

    try {
        // Extract auth token once for all Supabase operations
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        const client = getAuthorizedClient(token);

        let jobData;
        let filePath = '';
        if (file) {
            const form = new FormData();
            form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
            const response = await axios.post(`${INGEST_SERVICE_URL}/ingest`, form, { headers: { ...form.getHeaders() } });
            jobData = response.data;
            filePath = jobData.s3_key; // In this dev setup, s3_key is used as relative file path

            // Create the investigation record in Supabase
            await resultsService.createInvestigation(userId, jobData, client);
        } else {
            jobData = { job_id: `url_${Date.now()}`, status: 'received' };
        }

        // Call ML Orchestrator for real forensic analysis
        const ML_ORCHESTRATOR_URL = process.env.ML_ORCHESTRATOR_URL || 'http://localhost:8002';
        const mlResponse = await axios.post(`${ML_ORCHESTRATOR_URL}/analyze`, {
            job_id: jobData.job_id,
            file_path: filePath,
            media_type: media_type
        });

        const layerScores = mlResponse.data.layers;
        const resultStats = aggregator.calculateTrustScore(media_type, layerScores);

        // Save Result to Supabase
        await resultsService.saveResult(jobData.job_id, {
            ...resultStats,
            layers: layerScores
        }, client);

        res.status(202).json({
            data: {
                id: jobData.job_id,
                type: 'job',
                attributes: {
                    status: 'complete',
                    trust_score: resultStats.trust_score,
                    verdict: resultStats.verdict,
                    layers: layerScores
                }
            }
        });
    } catch (err) {
        console.error('Analysis Pipeline Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to process media analysis: ' + (err.response?.data?.detail || err.message) });
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
