const authService = require('../services/auth.service');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            errors: [{
                status: '401',
                code: 'AUTH_REQUIRED',
                title: 'Authentication Required',
                detail: 'Bearer token must be provided in the Authorization header'
            }]
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const user = await authService.verifySupabaseToken(token);
        if (!user) throw new Error('Invalid token');

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            errors: [{
                status: '401',
                code: 'INVALID_TOKEN',
                title: 'Invalid Token',
                detail: 'The provided forensic badge is invalid or has expired'
            }]
        });
    }
};

module.exports = { protect };
