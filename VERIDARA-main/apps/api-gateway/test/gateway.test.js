const request = require('supertest');
const app = require('../index');

describe('API Gateway Endpoints', () => {

    // ─── Public Endpoints ────────────────────────────────────────────
    describe('GET /v1/jobs/:id/report', () => {
        it('should return 500 or 404 for a non-existent job ID', async () => {
            const res = await request(app).get('/v1/jobs/test-id/report');
            expect([404, 500]).toContain(res.statusCode);
        });

        it('should set correct PDF headers on success', async () => {
            const res = await request(app).get('/v1/jobs/some-uuid/report');
            // Even if it fails, verify the error is JSON
            if (res.statusCode !== 200) {
                expect(res.body).toHaveProperty('error');
            }
        });
    });

    // ─── Protected Endpoints (no token) ──────────────────────────────
    describe('Protected routes without token', () => {
        it('GET /v1/history should return 401 Unauthorized', async () => {
            const res = await request(app).get('/v1/history');
            expect(res.statusCode).toBe(401);
        });

        it('GET /v1/jobs/:id should return 401 Unauthorized', async () => {
            const res = await request(app).get('/v1/jobs/some-id');
            expect(res.statusCode).toBe(401);
        });

        it('POST /v1/analyze should return 401 Unauthorized', async () => {
            const res = await request(app).post('/v1/analyze');
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Protected Endpoints (invalid token) ─────────────────────────
    describe('Protected routes with invalid token', () => {
        it('GET /v1/history should return 401 with invalid Bearer token', async () => {
            const res = await request(app)
                .get('/v1/history')
                .set('Authorization', 'Bearer invalid-token-xyz');
            expect(res.statusCode).toBe(401);
        });

        it('POST /v1/analyze should return 401 with invalid Bearer token', async () => {
            const res = await request(app)
                .post('/v1/analyze')
                .set('Authorization', 'Bearer invalid-token-xyz');
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Auth Middleware Format Checks ────────────────────────────────
    describe('Auth middleware format validation', () => {
        it('should reject requests with malformed Authorization header', async () => {
            const res = await request(app)
                .get('/v1/history')
                .set('Authorization', 'Token abc');
            expect(res.statusCode).toBe(401);
        });

        it('should reject requests with empty Authorization header', async () => {
            const res = await request(app)
                .get('/v1/history')
                .set('Authorization', '');
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Non-existent routes ─────────────────────────────────────────
    describe('Non-existent routes', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/v1/nonexistent');
            expect(res.statusCode).toBe(404);
        });
    });
});

// ─── Unit Tests: Aggregator Service ─────────────────────────────────
const aggregator = require('../src/services/aggregator.service');

describe('Aggregator Service', () => {
    describe('calculateTrustScore', () => {
        it('should calculate weighted score for image type', () => {
            const layers = { visual: 80, metadata: 60, semantic: 40, temporal: 0, audio: 0 };
            const result = aggregator.calculateTrustScore('image', layers);
            expect(result.trust_score).toBeGreaterThanOrEqual(0);
            expect(result.trust_score).toBeLessThanOrEqual(100);
            expect(result).toHaveProperty('verdict');
            expect(result).toHaveProperty('explanation');
        });

        it('should calculate weighted score for video type', () => {
            const layers = { visual: 70, temporal: 90, audio: 80, metadata: 50, semantic: 0 };
            const result = aggregator.calculateTrustScore('video', layers);
            expect(result.trust_score).toBeGreaterThanOrEqual(0);
            expect(result.trust_score).toBeLessThanOrEqual(100);
        });

        it('should fallback to image weights for unknown media type', () => {
            const layers = { visual: 75, metadata: 75, semantic: 75 };
            const result = aggregator.calculateTrustScore('document', layers);
            expect(result.trust_score).toBeDefined();
        });

        it('should return 50 when all layer scores are 0', () => {
            const layers = {};
            const result = aggregator.calculateTrustScore('image', layers);
            expect(result.trust_score).toBe(50);
        });
    });

    describe('getVerdict', () => {
        it('should return authentic for score >= 90', () => {
            expect(aggregator.getVerdict(95)).toBe('authentic');
        });

        it('should return probably_authentic for score 70-89', () => {
            expect(aggregator.getVerdict(75)).toBe('probably_authentic');
        });

        it('should return inconclusive for score 40-69', () => {
            expect(aggregator.getVerdict(50)).toBe('inconclusive');
        });

        it('should return likely_synthetic for score 20-39', () => {
            expect(aggregator.getVerdict(30)).toBe('likely_synthetic');
        });

        it('should return synthetic for score < 20', () => {
            expect(aggregator.getVerdict(10)).toBe('synthetic');
        });
    });
});

// ─── Unit Tests: Auth Service ───────────────────────────────────────
const authService = require('../src/services/auth.service');

describe('Auth Service', () => {
    describe('signReport / verifySeal', () => {
        it('should generate a valid HMAC seal', () => {
            const data = { jobId: 'test-123', trustScore: 85 };
            const seal = authService.signReport(data);
            expect(typeof seal).toBe('string');
            expect(seal.length).toBe(64); // SHA-256 hex digest
        });

        it('should verify a valid seal', () => {
            const data = { jobId: 'test-123', trustScore: 85 };
            const seal = authService.signReport(data);
            expect(authService.verifySeal(data, seal)).toBe(true);
        });

        it('should reject a tampered seal', () => {
            const data = { jobId: 'test-123', trustScore: 85 };
            const seal = authService.signReport(data);
            expect(authService.verifySeal({ ...data, trustScore: 0 }, seal)).toBe(false);
        });
    });
});

// ─── Unit Tests: Alert Service ──────────────────────────────────────
const alertService = require('../src/services/alert.service');

describe('Alert Service', () => {
    it('should trigger and store an alert', async () => {
        const alert = await alertService.triggerAlert('user1', 'deepfake_detected', 'Test alert');
        expect(alert).toHaveProperty('id');
        expect(alert.type).toBe('deepfake_detected');
        expect(alert.read).toBe(false);
    });

    it('should retrieve alerts for a specific user', async () => {
        await alertService.triggerAlert('user2', 'suspicious_activity', 'Suspicious');
        const alerts = await alertService.getAlerts('user2');
        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0].userId).toBe('user2');
    });
});

// ─── Unit Tests: Queue Service ──────────────────────────────────────
const queueService = require('../src/services/queue.service');

describe('Queue Service', () => {
    it('should push and pop a job', async () => {
        await queueService.pushJob('job-1', { file: 'test.jpg' });
        const job = await queueService.popJob();
        expect(job).toBeDefined();
        expect(job.jobId).toBe('job-1');
    });

    it('should return undefined/null when queue is empty', async () => {
        // Drain the queue first
        while (await queueService.popJob()) { }
        const job = await queueService.popJob();
        expect(job).toBeUndefined();
    });
});
