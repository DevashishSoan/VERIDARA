const { supabase } = require('../config/supabase');
const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'truth_lens_master_key_2026';

class AuthService {
    /**
     * Verifies a Supabase JWT sent in the Authorization header
     */
    async verifySupabaseToken(token) {
        try {
            console.log('[AUTH] Verifying token:', token?.substring(0, 20) + '...');
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error) {
                console.error('[AUTH] Supabase getUser error:', error.message, error.status);
                throw error;
            }
            if (!user) {
                console.error('[AUTH] No user returned from Supabase');
                throw new Error('No user');
            }
            console.log('[AUTH] User verified:', user.id, user.email);
            return user;
        } catch (err) {
            console.error('[AUTH] Token verification failed:', err.message);
            return null;
        }
    }

    /**
     * Middleware for protecting clinical/forensic routes
     */
    async protect(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No forensic badge provided' });
        }

        const token = authHeader.split(' ')[1];
        const user = await this.verifySupabaseToken(token);

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid forensic badge' });
        }

        req.user = user;
        next();
    }

    /**
     * Generates a cryptographic seal for a forensic report
     */
    signReport(reportData) {
        const dataString = JSON.stringify(reportData);
        return crypto
            .createHmac('sha256', JWT_SECRET)
            .update(dataString)
            .digest('hex');
    }

    /**
     * Verifies if a seal is valid for the given report data
     */
    verifySeal(reportData, seal) {
        const expectedSeal = this.signReport(reportData);
        return expectedSeal === seal;
    }
}

module.exports = new AuthService();
