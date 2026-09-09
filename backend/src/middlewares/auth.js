const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token || token === 'null' || token === 'undefined' || token === 'fake-jwt-token-for-scaffold') {
        return res.status(401).json({ error: 'Access denied. No valid token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware;
