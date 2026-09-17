const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const auth = require('../middlewares/auth');

// Middleware: must be authenticated
router.use(auth);

// Middleware: must be super_admin
const superAdminOnly = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }
    next();
};

router.use(superAdminOnly);

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/superadmin/hotels — list all hotels
router.get('/hotels', async (req, res) => {
    try {
        const [hotels] = await pool.query(`
            SELECT 
                h.id, h.uuid, h.name, h.slug, h.address, h.contact_email, h.contact_phone,
                h.branding_primary_color, h.branding_logo_url, h.is_suspended, h.created_at,
                h.razorpay_key_id,
                COUNT(DISTINCT b.id) as total_bookings,
                SUM(CASE WHEN b.booking_status NOT IN ('cancelled', 'checked_out') THEN 1 ELSE 0 END) as active_bookings,
                COALESCE(SUM(CASE WHEN b.booking_status != 'cancelled' THEN b.total_amount ELSE 0 END), 0) as revenue,
                COUNT(DISTINCT uh.user_id) as user_count,
                COUNT(DISTINCT rt.id) as room_type_count
            FROM hotels h
            LEFT JOIN bookings b ON h.id = b.hotel_id
            LEFT JOIN user_hotels uh ON h.id = uh.hotel_id
            LEFT JOIN room_types rt ON h.id = rt.hotel_id
            GROUP BY h.id
            ORDER BY h.created_at DESC
        `);
        res.json(hotels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/superadmin/stats — aggregate platform stats
router.get('/stats', async (req, res) => {
    try {
        const [hotelRows] = await pool.query('SELECT COUNT(*) as totalHotels, SUM(CASE WHEN is_suspended = 0 THEN 1 ELSE 0 END) as activeHotels FROM hotels');
        const [bookingRows] = await pool.query('SELECT COUNT(*) as totalBookings, COALESCE(SUM(CASE WHEN booking_status != "cancelled" THEN total_amount ELSE 0 END), 0) as totalRevenue FROM bookings');
        const [userRows] = await pool.query('SELECT COUNT(*) as totalUsers FROM users WHERE role != "super_admin"');

        res.json({
            totalHotels: hotelRows[0].totalHotels || 0,
            activeHotels: hotelRows[0].activeHotels || 0,
            totalBookings: bookingRows[0].totalBookings || 0,
            totalRevenue: bookingRows[0].totalRevenue || 0,
            totalUsers: userRows[0].totalUsers || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/superadmin/top-hotels — top 5 hotels by revenue
router.get('/top-hotels', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT h.id, h.name, h.branding_primary_color,
                COUNT(b.id) as total_bookings,
                COALESCE(SUM(CASE WHEN b.booking_status != 'cancelled' THEN b.total_amount ELSE 0 END), 0) as revenue
            FROM hotels h
            LEFT JOIN bookings b ON h.id = b.hotel_id
            GROUP BY h.id
            ORDER BY revenue DESC
            LIMIT 5
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/superadmin/recent-bookings — last 20 bookings platform-wide
router.get('/recent-bookings', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT b.id, b.guest_name, b.guest_email, b.check_in_date, b.check_out_date,
                   b.total_amount, b.booking_status, b.payment_status, b.created_at,
                   h.name as hotel_name, rt.name as room_type_name
            FROM bookings b
            JOIN hotels h ON b.hotel_id = h.id
            JOIN room_types rt ON b.room_type_id = rt.id
            ORDER BY b.created_at DESC
            LIMIT 20
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/superadmin/hotels/:id/stats — single hotel analytics
router.get('/hotels/:id/stats', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                COUNT(b.id) as total_bookings,
                COALESCE(SUM(CASE WHEN b.booking_status != 'cancelled' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
                SUM(CASE WHEN b.booking_status = 'checked_in' THEN 1 ELSE 0 END) as active_stays,
                SUM(CASE WHEN b.booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancellations
            FROM bookings b WHERE b.hotel_id = ?
        `, [req.params.id]);
        const [roomRows] = await pool.query('SELECT COUNT(*) as room_types, SUM(total_rooms) as total_rooms FROM room_types WHERE hotel_id = ?', [req.params.id]);
        res.json({ ...rows[0], ...roomRows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/superadmin/hotels — create new hotel
router.post('/hotels', async (req, res) => {
    try {
        const { name, address, contact_email, contact_phone, branding_primary_color } = req.body;
        if (!name) return res.status(400).json({ error: 'Hotel name is required.' });

        const uuid = crypto.randomUUID();
        // Generate a URL-friendly slug from the hotel name
        let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug) slug = 'hotel-' + Date.now();
        
        // Append a random string to slug to ensure uniqueness if needed, but for now we'll just try inserting
        try {
            const [result] = await pool.query(
                `INSERT INTO hotels (name, slug, uuid, address, contact_email, contact_phone, branding_primary_color, timezone)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'UTC')`,
                [name, slug, uuid, address || null, contact_email || null, contact_phone || null, branding_primary_color || '#6366f1']
            );
            res.status(201).json({ id: result.insertId, name, slug, uuid, message: 'Hotel created successfully.' });
        } catch (dbErr) {
            if (dbErr.code === 'ER_DUP_ENTRY') {
                // If slug is duplicate, append a random suffix
                slug = slug + '-' + crypto.randomBytes(2).toString('hex');
                const [result] = await pool.query(
                    `INSERT INTO hotels (name, slug, uuid, address, contact_email, contact_phone, branding_primary_color, timezone)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'UTC')`,
                    [name, slug, uuid, address || null, contact_email || null, contact_phone || null, branding_primary_color || '#6366f1']
                );
                res.status(201).json({ id: result.insertId, name, slug, uuid, message: 'Hotel created successfully.' });
            } else {
                throw dbErr;
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/superadmin/hotels/:id — edit hotel details
router.put('/hotels/:id', async (req, res) => {
    try {
        const { name, address, contact_email, contact_phone, branding_primary_color } = req.body;
        await pool.query(
            `UPDATE hotels SET
                name = COALESCE(?, name),
                address = COALESCE(?, address),
                contact_email = COALESCE(?, contact_email),
                contact_phone = COALESCE(?, contact_phone),
                branding_primary_color = COALESCE(?, branding_primary_color)
             WHERE id = ?`,
            [name, address, contact_email, contact_phone, branding_primary_color, req.params.id]
        );
        res.json({ message: 'Hotel updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/superadmin/hotels/:id/suspend — toggle suspend status
router.patch('/hotels/:id/suspend', async (req, res) => {
    try {
        await pool.query('UPDATE hotels SET is_suspended = NOT is_suspended WHERE id = ?', [req.params.id]);
        const [rows] = await pool.query('SELECT is_suspended FROM hotels WHERE id = ?', [req.params.id]);
        res.json({ is_suspended: rows[0].is_suspended, message: rows[0].is_suspended ? 'Hotel suspended.' : 'Hotel activated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/superadmin/hotels/:id — permanently delete hotel
router.delete('/hotels/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM hotels WHERE id = ?', [req.params.id]);
        res.json({ message: 'Hotel deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER / STAFF MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/superadmin/hotels/:id/users — list all users of a hotel
router.get('/hotels/:id/users', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.name, u.email, uh.role, uh.created_at 
            FROM users u
            JOIN user_hotels uh ON u.id = uh.user_id
            WHERE uh.hotel_id = ? 
            ORDER BY uh.role, u.name
        `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/superadmin/users — list all users (all hotels)
router.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.name, u.email, u.role as global_role, u.created_at, h.name as hotel_name, h.id as hotel_id, uh.role as role
            FROM users u
            LEFT JOIN user_hotels uh ON u.id = uh.user_id
            LEFT JOIN hotels h ON uh.hotel_id = h.id
            WHERE u.role != 'super_admin'
            ORDER BY u.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/superadmin/users — create hotel admin
router.post('/users', async (req, res) => {
    try {
        const { name, email, password, hotel_id } = req.body;
        if (!name || !email || !password || !hotel_id) {
            return res.status(400).json({ error: 'name, email, password, and hotel_id are all required.' });
        }
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE id = ?', [hotel_id]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Target hotel not found.' });

        // Check if user already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        let userId;

        if (existing.length > 0) {
            userId = existing[0].id;
        } else {
            // Create new user
            const password_hash = await bcrypt.hash(password, 10);
            const [result] = await pool.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [name, email, password_hash, 'user']
            );
            userId = result.insertId;
        }

        // Add user to hotel
        await pool.query(
            'INSERT IGNORE INTO user_hotels (user_id, hotel_id, role) VALUES (?, ?, ?)',
            [userId, hotel_id, 'owner']
        );

        res.status(201).json({ id: userId, name, email, role: 'owner', hotel_id, message: 'Hotel Admin added successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/superadmin/users/:id — delete a user
router.delete('/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ? AND role != "super_admin"', [req.params.id]);
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/superadmin/users/:id/reset-password — force reset password
router.patch('/users/:id/reset-password', async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        const password_hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ? AND role != "super_admin"', [password_hash, req.params.id]);
        res.json({ message: 'Password reset successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/superadmin/impersonate/:userId — issue impersonation token
router.post('/impersonate/:userId', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, hotel_id, role, name, email FROM users WHERE id = ? AND role != "super_admin"', [req.params.userId]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found.' });

        const user = users[0];
        const token = jwt.sign(
            { id: user.id, hotel_id: user.hotel_id, role: user.role, impersonated_by: req.user.id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '2h' }
        );
        res.json({ token, user: { id: user.id, name: user.name, role: user.role, hotel_id: user.hotel_id } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/superadmin/settings
router.get('/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM platform_settings WHERE id = 1');
        if (rows.length === 0) return res.status(404).json({ error: 'Settings not found.' });
        // Never expose smtp_pass & twilio_auth_token in plaintext — mask them
        const s = rows[0];
        res.json({
            ...s,
            smtp_pass: s.smtp_pass ? '••••••••' : '',
            twilio_auth_token: s.twilio_auth_token ? '••••••••' : ''
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/superadmin/settings
router.put('/settings', async (req, res) => {
    try {
        const {
            default_tax_rate, default_primary_color, terms_of_service_url,
            smtp_host, smtp_port, smtp_user, smtp_pass,
            twilio_account_sid, twilio_auth_token, twilio_phone_number
        } = req.body;

        // Only update password fields if a real value is provided (not the masked placeholder)
        const fields = [];
        const values = [];

        if (default_tax_rate !== undefined)      { fields.push('default_tax_rate = ?');      values.push(default_tax_rate); }
        if (default_primary_color !== undefined) { fields.push('default_primary_color = ?'); values.push(default_primary_color); }
        if (terms_of_service_url !== undefined)  { fields.push('terms_of_service_url = ?');  values.push(terms_of_service_url); }
        if (smtp_host !== undefined)             { fields.push('smtp_host = ?');             values.push(smtp_host); }
        if (smtp_port !== undefined)             { fields.push('smtp_port = ?');             values.push(smtp_port); }
        if (smtp_user !== undefined)             { fields.push('smtp_user = ?');             values.push(smtp_user); }
        if (smtp_pass && smtp_pass !== '••••••••') { fields.push('smtp_pass = ?');           values.push(smtp_pass); }
        if (twilio_account_sid !== undefined)   { fields.push('twilio_account_sid = ?');    values.push(twilio_account_sid); }
        if (twilio_auth_token && twilio_auth_token !== '••••••••') { fields.push('twilio_auth_token = ?'); values.push(twilio_auth_token); }
        if (twilio_phone_number !== undefined)  { fields.push('twilio_phone_number = ?');   values.push(twilio_phone_number); }

        if (fields.length > 0) {
            await pool.query(`UPDATE platform_settings SET ${fields.join(', ')} WHERE id = 1`, values);
        }
        res.json({ message: 'Platform settings updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
