const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middlewares/auth');

// Auth routes (not protected by auth middleware)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, hotel_id: user.hotel_id, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, name: user.name, role: user.role, hotel_id: user.hotel_id } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin dashboard routes (protected by auth middleware)
router.use(auth);

router.get('/room-types', async (req, res) => {
    try {
        const [roomTypes] = await pool.query('SELECT * FROM room_types WHERE hotel_id = ?', [req.user.hotel_id]);
        res.json(roomTypes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/bookings', async (req, res) => {
    try {
        const [bookings] = await pool.query('SELECT * FROM bookings WHERE hotel_id = ? ORDER BY created_at DESC', [req.user.hotel_id]);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/bookings/:id/status', async (req, res) => {
    try {
        const { booking_status, payment_status } = req.body;
        await pool.query(
            'UPDATE bookings SET booking_status = COALESCE(?, booking_status), payment_status = COALESCE(?, payment_status) WHERE id = ? AND hotel_id = ?',
            [booking_status, payment_status, req.params.id, req.user.hotel_id]
        );
        
        if (booking_status === 'cancelled') {
            const [bookings] = await pool.query('SELECT guest_email FROM bookings WHERE id = ?', [req.params.id]);
            if (bookings.length > 0) {
                const notificationService = require('../services/notificationService');
                await notificationService.sendCancellationAlert(req.params.id, bookings[0].guest_email);
            }
        }
        
        res.json({ message: 'Booking status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Room Types CRUD
router.post('/room-types', async (req, res) => {
    try {
        const { name, description, base_price, default_capacity, max_capacity, extra_bed_allowed } = req.body;
        const [result] = await pool.query(
            'INSERT INTO room_types (hotel_id, name, description, base_price, default_capacity, max_capacity, extra_bed_allowed) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.hotel_id, name, description, base_price, default_capacity, max_capacity, extra_bed_allowed || false]
        );
        res.json({ id: result.insertId, message: 'Room type created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/room-types/:id', async (req, res) => {
    try {
        const { name, description, base_price, default_capacity, max_capacity, extra_bed_allowed } = req.body;
        await pool.query(
            'UPDATE room_types SET name = ?, description = ?, base_price = ?, default_capacity = ?, max_capacity = ?, extra_bed_allowed = ? WHERE id = ? AND hotel_id = ?',
            [name, description, base_price, default_capacity, max_capacity, extra_bed_allowed, req.params.id, req.user.hotel_id]
        );
        res.json({ message: 'Room type updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/room-types/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM room_types WHERE id = ? AND hotel_id = ?', [req.params.id, req.user.hotel_id]);
        res.json({ message: 'Room type deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REPORTS & CALENDAR ---

router.get('/reports/stats', async (req, res) => {
    try {
        const hotelId = req.user.hotel_id;
        
        // Revenue (sum of total_amount for non-cancelled bookings)
        const [revRow] = await pool.query(`SELECT SUM(total_amount) as revenue FROM bookings WHERE hotel_id = ? AND booking_status != 'cancelled'`, [hotelId]);
        
        // Total bookings
        const [bkRow] = await pool.query(`SELECT COUNT(*) as total_bookings FROM bookings WHERE hotel_id = ?`, [hotelId]);
        
        // Arrivals today
        const [arrRow] = await pool.query(`SELECT COUNT(*) as arrivals FROM bookings WHERE hotel_id = ? AND check_in_date = CURDATE()`, [hotelId]);
        
        // Departures today
        const [depRow] = await pool.query(`SELECT COUNT(*) as departures FROM bookings WHERE hotel_id = ? AND check_out_date = CURDATE()`, [hotelId]);

        res.json({
            revenue: revRow[0].revenue || 0,
            totalBookings: bkRow[0].total_bookings || 0,
            arrivalsToday: arrRow[0].arrivals || 0,
            departuresToday: depRow[0].departures || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/reports/calendar', async (req, res) => {
    try {
        const hotelId = req.user.hotel_id;
        const { start, end } = req.query; // optional date filtering
        
        let query = `SELECT b.id, b.guest_name, b.check_in_date, b.check_out_date, b.booking_status, r.name as room_type 
                     FROM bookings b JOIN room_types r ON b.room_type_id = r.id 
                     WHERE b.hotel_id = ? AND b.booking_status != 'cancelled'`;
        let params = [hotelId];

        if (start && end) {
            query += ` AND b.check_in_date <= ? AND b.check_out_date >= ?`;
            params.push(end, start);
        }

        const [bookings] = await pool.query(query, params);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
