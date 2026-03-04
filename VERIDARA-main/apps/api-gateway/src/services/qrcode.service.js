const QRCode = require('qrcode');
require('dotenv').config();

class QRCodeService {
    /**
     * Generates a Data URL for a QR code linking to the verification page
     */
    async generateVerificationQR(jobId) {
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        const verificationUrl = `${appUrl}/verify/${jobId}`;
        try {
            return await QRCode.toDataURL(verificationUrl, {
                color: {
                    dark: '#00C897', // TruthLens Primary Green
                    light: '#00000000' // Transparent background
                },
                margin: 1,
                width: 150
            });
        } catch (err) {
            console.error('QR Generation Error:', err);
            throw new Error('Failed to generate verification QR');
        }
    }
}

module.exports = new QRCodeService();
