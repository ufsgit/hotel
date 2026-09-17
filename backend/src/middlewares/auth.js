const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token || token === 'null' || token === 'undefined' || token === 'fake-jwt-token-for-scaffold') {
        return res.status(401).json({ error: 'Access denied. No valid token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded; // Contains id and role (super_admin or user)

        // Super admins bypass property-level checks completely
        if (req.user.role === 'super_admin') {
            return next();
        }

        // For regular users, we expect an X-Hotel-ID header if they are trying to access property-specific data.
        // Some routes (like /api/admin/my-hotels) don't need a specific hotel_id.
        const hotelIdHeader = req.header('X-Hotel-ID');
        
        // If the route doesn't require a hotel_id (e.g. /my-hotels or changing personal profile), just proceed.
        // But for most /api/admin/* routes, they assume req.user.hotel_id exists.
        if (!hotelIdHeader) {
            // We'll let it pass, but if the route requires req.user.hotel_id, it will fail there or we could block it here.
            // Let's pass it, as the /my-hotels route needs to work without one.
            return next();
        }

        const hotelId = parseInt(hotelIdHeader, 10);
        if (isNaN(hotelId)) {
            return res.status(400).json({ error: 'Invalid X-Hotel-ID header.' });
        }

        // Check if the user has access to this hotel
        const [rows] = await pool.query('SELECT role FROM user_hotels WHERE user_id = ? AND hotel_id = ?', [req.user.id, hotelId]);
        if (rows.length === 0) {
            return res.status(403).json({ error: 'Forbidden. You do not have access to this property.' });
        }

        // Attach property-specific info to the request!
        // This ensures all downstream routes (which expect req.user.hotel_id and req.user.role) continue to work as-is.
        req.user.hotel_id = hotelId;
        req.user.role = rows[0].role; // Their role *at this specific property* (owner vs staff)

        next();
    } catch (ex) {
        console.error('Auth middleware error:', ex);
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware;
