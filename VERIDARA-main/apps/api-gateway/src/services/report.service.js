const PDFDocument = require('pdfkit');
const qrcodeService = require('./qrcode.service');
const authService = require('./auth.service');
const resultsService = require('./results.service');
const fs = require('fs');
const path = require('path');

class ReportService {
    /**
     * Generates a forensic report PDF for a given job ID
     */
    async generateReport(jobId) {
        const result = await resultsService.getResultByJobId(jobId);
        if (!result) throw new Error('Result not found');

        const qrDataUrl = await qrcodeService.generateVerificationQR(jobId);
        const seal = authService.signReport({ jobId, trustScore: result.trust_score });

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- Header ---
            doc.fillColor('#00C897').fontSize(24).text('TRUTHLENS', { align: 'center' });
            doc.fontSize(10).fillColor('#666666').text('Authenticity Certificate & Forensic Report', { align: 'center' });
            doc.moveDown(2);

            // --- Summary Section ---
            doc.fillColor('#000000').fontSize(14).text('Investigation Summary', { underline: true });
            doc.moveDown();
            doc.fontSize(10).text(`Job ID: ${jobId}`);
            doc.text(`Analysis Date: ${new Date(result.created_at).toLocaleString()}`);
            doc.text(`Verdict: ${result.verdict.toUpperCase().replace('_', ' ')}`);
            doc.moveDown();

            // --- Trust Score ---
            doc.fontSize(12).text('Final Trust Score:', { continued: true });
            doc.fillColor(result.trust_score > 70 ? '#00C897' : '#FF305B').fontSize(16).text(` ${result.trust_score}/100`);
            doc.moveDown();

            // --- Forensic Layers ---
            doc.fillColor('#000000').fontSize(12).text('Forensic Layers Breakdown:');
            const layers = [
                { name: 'Visual Forensics', score: result.layers?.visual || 0 },
                { name: 'Temporal Analysis', score: result.layers?.temporal || 0 },
                { name: 'Audio Spectral', score: result.layers?.audio || 0 },
                { name: 'Metadata & Provenance', score: result.layers?.metadata || 0 },
                { name: 'Semantic Consistency', score: result.layers?.semantic || 0 }
            ];

            layers.forEach(layer => {
                doc.fontSize(10).fillColor('#333333').text(`${layer.name}: ${layer.score}%`);
                // Basic progress bar
                doc.rect(doc.x + 150, doc.y - 10, 200, 8).fill('#eeeeee');
                doc.rect(doc.x + 150, doc.y - 10, 200 * (layer.score / 100), 8).fill('#00C897');
                doc.moveDown(0.5);
            });

            doc.moveDown();
            doc.fontSize(10).fillColor('#000000').text('Forensic Explanation:');
            doc.fontSize(9).fillColor('#444444').text(result.explanation, { width: 450 });

            // --- Cryptographic Seal & QR ---
            doc.moveDown(4);
            doc.fontSize(12).fillColor('#000000').text('Verification & Integrity', { underline: true });
            doc.moveDown();

            const qrImage = qrDataUrl.split(',')[1];
            doc.image(Buffer.from(qrImage, 'base64'), 400, doc.y - 20, { width: 100 });

            doc.fontSize(8).fillColor('#666666').text('Cryptographic Seal (HMAC-SHA256):');
            doc.fontSize(6).text(seal, { width: 300 });
            doc.moveDown();
            doc.fontSize(8).text('Scan the QR code to verify this certificate on the TruthLens blockchain portal.');

            doc.end();
        });
    }
}

module.exports = new ReportService();
