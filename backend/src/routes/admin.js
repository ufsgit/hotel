const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config — store logos in /uploads/logos/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/logos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `hotel_logo_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

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

// --- LOGO UPLOAD ---
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        // Build the public URL
        const host = req.get('host'); // e.g. localhost:3000
        const protocol = req.protocol;  // http
        const logoUrl = `${protocol}://${host}/uploads/logos/${req.file.filename}`;
        // Persist to DB immediately
        await pool.query('UPDATE hotels SET branding_logo_url = ? WHERE id = ?', [logoUrl, req.user.hotel_id]);
        res.json({ url: logoUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

// Multer config — store room photos in /uploads/rooms/
const roomStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/rooms');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `room_${Date.now()}${ext}`);
    }
});
const uploadRoomPhoto = multer({
    storage: roomStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

router.post('/upload-room-photo', uploadRoomPhoto.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const host = req.get('host');
        const protocol = req.protocol;
        const photoUrl = `${protocol}://${host}/uploads/rooms/${req.file.filename}`;
        res.json({ url: photoUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Room Types CRUD
router.post('/room-types', async (req, res) => {
    try {
        const { name, description, base_price, default_capacity, max_capacity, max_occupancy, extra_bed_allowed, extra_bed_price, total_rooms, photos } = req.body;
        const maxOcc = max_occupancy || max_capacity || default_capacity || 2;
        let photosJson = null;
        if (photos) {
            photosJson = JSON.stringify(Array.isArray(photos) ? photos : [photos]);
        }
        const [result] = await pool.query(
            'INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, extra_bed_allowed, extra_bed_price, total_rooms, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.hotel_id, name || '', description || '', base_price || 0, maxOcc, extra_bed_allowed ? 1 : 0, extra_bed_price || 0, total_rooms || 10, photosJson]
        );
        res.json({ id: result.insertId, message: 'Room type created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/room-types/:id', async (req, res) => {
    try {
        const { name, description, base_price, default_capacity, max_capacity, max_occupancy, extra_bed_allowed, extra_bed_price, total_rooms, photos } = req.body;
        const maxOcc = max_occupancy || max_capacity || default_capacity || 2;
        let photosJson = null;
        if (photos) {
            photosJson = JSON.stringify(Array.isArray(photos) ? photos : [photos]);
        }
        await pool.query(
            'UPDATE room_types SET name = ?, description = ?, base_price = ?, max_occupancy = ?, extra_bed_allowed = ?, extra_bed_price = ?, total_rooms = COALESCE(?, total_rooms), photos = COALESCE(?, photos) WHERE id = ? AND hotel_id = ?',
            [name, description || '', base_price || 0, maxOcc, extra_bed_allowed ? 1 : 0, extra_bed_price || 0, total_rooms, photosJson, req.params.id, req.user.hotel_id]
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
        
        // Collected Revenue: only paid or partial bookings
        const [revRow] = await pool.query(
            `SELECT COALESCE(SUM(CASE 
                WHEN payment_status = 'paid' THEN total_amount 
                WHEN payment_status = 'partial' THEN total_amount / 2 
                ELSE 0 
            END), 0) as revenue FROM bookings WHERE hotel_id = ? AND booking_status != 'cancelled'`,
            [hotelId]
        );

        // Expected Revenue: all non-cancelled bookings (including pay-at-hotel)
        const [expectedRevRow] = await pool.query(
            `SELECT COALESCE(SUM(total_amount), 0) as expected_revenue FROM bookings WHERE hotel_id = ? AND booking_status != 'cancelled'`,
            [hotelId]
        );
        
        // Total bookings
        const [bkRow] = await pool.query(`SELECT COUNT(*) as total_bookings FROM bookings WHERE hotel_id = ?`, [hotelId]);
        
        // Arrivals today
        const [arrRow] = await pool.query(`SELECT COUNT(*) as arrivals FROM bookings WHERE hotel_id = ? AND check_in_date = CURDATE()`, [hotelId]);
        
        // Departures today
        const [depRow] = await pool.query(`SELECT COUNT(*) as departures FROM bookings WHERE hotel_id = ? AND check_out_date = CURDATE()`, [hotelId]);

        res.json({
            revenue: parseFloat(revRow[0].revenue) || 0,
            expectedRevenue: parseFloat(expectedRevRow[0].expected_revenue) || 0,
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
        
        let query = `SELECT b.id, b.room_type_id, b.guest_name, b.guest_email, b.guest_phone, b.check_in_date, b.check_out_date, b.booking_status, b.payment_status, b.total_amount, r.name as room_type 
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


// --- OFFERS CRUD ---

router.get('/offers', async (req, res) => {
    try {
        const [offers] = await pool.query(
            'SELECT * FROM seasons_offers WHERE hotel_id = ? ORDER BY priority DESC',
            [req.user.hotel_id]
        );
        res.json(offers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/offers', async (req, res) => {
    try {
        const { name, description, banner_image_url, discount_type, discount_value, start_date, end_date, is_active, priority } = req.body;
        const [result] = await pool.query(
            `INSERT INTO seasons_offers (hotel_id, name, description, banner_image_url, discount_type, discount_value, start_date, end_date, is_active, priority)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.hotel_id, name, description || '', banner_image_url || '', discount_type, discount_value, start_date, end_date, is_active || false, priority || 0]
        );
        res.json({ id: result.insertId, message: 'Offer created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/offers/:id', async (req, res) => {
    try {
        const { name, description, banner_image_url, discount_type, discount_value, start_date, end_date, is_active, priority } = req.body;
        await pool.query(
            `UPDATE seasons_offers SET name=?, description=?, banner_image_url=?, discount_type=?, discount_value=?, start_date=?, end_date=?, is_active=?, priority=?
             WHERE id=? AND hotel_id=?`,
            [name, description, banner_image_url, discount_type, discount_value, start_date, end_date, is_active, priority, req.params.id, req.user.hotel_id]
        );
        res.json({ message: 'Offer updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/offers/:id/toggle', async (req, res) => {
    try {
        await pool.query(
            'UPDATE seasons_offers SET is_active = NOT is_active WHERE id = ? AND hotel_id = ?',
            [req.params.id, req.user.hotel_id]
        );
        res.json({ message: 'Offer toggled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/offers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM seasons_offers WHERE id = ? AND hotel_id = ?', [req.params.id, req.user.hotel_id]);
        res.json({ message: 'Offer deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- HOTEL SETTINGS ---

router.get('/hotel-settings', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT name, slug, address, contact_email, contact_phone, branding_logo_url, branding_primary_color, timezone FROM hotels WHERE id = ?',
            [req.user.hotel_id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Hotel not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/hotel-settings', async (req, res) => {
    try {
        const { name, address, contact_email, contact_phone, branding_logo_url, branding_primary_color, timezone } = req.body;
        await pool.query(
            `UPDATE hotels SET
                name = COALESCE(?, name),
                address = COALESCE(?, address),
                contact_email = COALESCE(?, contact_email),
                contact_phone = COALESCE(?, contact_phone),
                branding_logo_url = COALESCE(?, branding_logo_url),
                branding_primary_color = COALESCE(?, branding_primary_color),
                timezone = COALESCE(?, timezone)
             WHERE id = ?`,
            [name, address, contact_email, contact_phone, branding_logo_url, branding_primary_color, timezone, req.user.hotel_id]
        );
        res.json({ message: 'Hotel settings updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
