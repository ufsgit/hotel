const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token || token === 'null' || token === 'undefined' || token === 'fake-jwt-token-for-scaffold') {
        return res.status(401).json({ error: 'Access denied. No valid token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;

        // ── Super admin: bypass all property-level checks ─────────────────────
        if (req.user.role === 'super_admin') {
            return next();
        }

        // ── Impersonation token: trust hotel_id baked into JWT ────────────────
        // Impersonation tokens are created by the super admin endpoint and contain
        // `hotel_id` and `impersonated_by` directly in the payload. We validate
        // the user really does belong to that hotel, then attach the info and proceed.
        if (decoded.impersonated_by && decoded.hotel_id) {
            const hotelId = parseInt(decoded.hotel_id, 10);
            const [rows] = await pool.query(
                'SELECT role FROM user_hotels WHERE user_id = ? AND hotel_id = ?',
                [decoded.id, hotelId]
            );
            if (rows.length === 0) {
                return res.status(403).json({ error: 'Forbidden. Impersonated user has no access to this property.' });
            }
            req.user.hotel_id = hotelId;
            req.user.role = rows[0].role;
            return next();
        }

        // ── Regular users: use the X-Hotel-ID header ──────────────────────────
        const hotelIdHeader = req.header('X-Hotel-ID');

        // If no hotel_id context, pass through (e.g. /my-hotels route)
        if (!hotelIdHeader) {
            return next();
        }

        const hotelId = parseInt(hotelIdHeader, 10);
        if (isNaN(hotelId)) {
            return res.status(400).json({ error: 'Invalid X-Hotel-ID header.' });
        }

        // Verify user has access to this hotel
        const [rows] = await pool.query(
            'SELECT role FROM user_hotels WHERE user_id = ? AND hotel_id = ?',
            [req.user.id, hotelId]
        );
        if (rows.length === 0) {
            return res.status(403).json({ error: 'Forbidden. You do not have access to this property.' });
        }

        req.user.hotel_id = hotelId;
        req.user.role = rows[0].role;
        next();

    } catch (ex) {
        console.error('Auth middleware error:', ex);
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware;

