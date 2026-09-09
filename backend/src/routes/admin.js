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
        const { booking_status, payment_status, amount_paid } = req.body;

        // Build dynamic SET clause
        const fields = [];
        const values = [];
        if (booking_status !== undefined) { fields.push('booking_status = ?'); values.push(booking_status); }
        if (payment_status !== undefined) { fields.push('payment_status = ?'); values.push(payment_status); }
        if (amount_paid !== undefined)    { fields.push('amount_paid = ?');    values.push(amount_paid); }

        if (fields.length > 0) {
            values.push(req.params.id, req.user.hotel_id);
            await pool.query(
                `UPDATE bookings SET ${fields.join(', ')} WHERE id = ? AND hotel_id = ?`,
                values
            );
        }

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

// Multer config — store offer banners in /uploads/offers/
const offerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/offers');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `offer_${Date.now()}${ext}`);
    }
});
const uploadOfferBanner = multer({
    storage: offerStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

router.post('/upload-offer-banner', uploadOfferBanner.single('banner'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const host = req.get('host');
        const protocol = req.protocol;
        const bannerUrl = `${protocol}://${host}/uploads/offers/${req.file.filename}`;
        res.json({ url: bannerUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Room Types CRUD
router.post('/room-types', async (req, res) => {
    try {
        const { name, description, base_price, default_capacity, max_capacity, max_occupancy, extra_bed_allowed, extra_bed_price, total_rooms, photos, amenities } = req.body;
        const maxOcc = max_occupancy || max_capacity || default_capacity || 2;
        let photosJson = null;
        if (photos) {
            photosJson = JSON.stringify(Array.isArray(photos) ? photos : [photos]);
        }
        let amenitiesJson = null;
        if (amenities) {
            amenitiesJson = JSON.stringify(Array.isArray(amenities) ? amenities : [amenities]);
        }
        const [result] = await pool.query(
            'INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, extra_bed_allowed, extra_bed_price, total_rooms, photos, amenities) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.hotel_id, name || '', description || '', base_price || 0, maxOcc, extra_bed_allowed ? 1 : 0, extra_bed_price || 0, total_rooms || 10, photosJson, amenitiesJson]
        );
        res.json({ id: result.insertId, message: 'Room type created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/room-types/:id', async (req, res) => {
    try {
        const { name, description, base_price, default_capacity, max_capacity, max_occupancy, extra_bed_allowed, extra_bed_price, total_rooms, photos, amenities } = req.body;
        const maxOcc = max_occupancy || max_capacity || default_capacity || 2;
        let photosJson = null;
        if (photos) {
            photosJson = JSON.stringify(Array.isArray(photos) ? photos : [photos]);
        }
        let amenitiesJson = null;
        if (amenities !== undefined) {
            amenitiesJson = JSON.stringify(Array.isArray(amenities) ? amenities : (amenities ? [amenities] : []));
        }
        await pool.query(
            'UPDATE room_types SET name = ?, description = ?, base_price = ?, max_occupancy = ?, extra_bed_allowed = ?, extra_bed_price = ?, total_rooms = COALESCE(?, total_rooms), photos = COALESCE(?, photos), amenities = COALESCE(?, amenities) WHERE id = ? AND hotel_id = ?',
            [name, description || '', base_price || 0, maxOcc, extra_bed_allowed ? 1 : 0, extra_bed_price || 0, total_rooms, photosJson, amenitiesJson, req.params.id, req.user.hotel_id]
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
                WHEN payment_status = 'partial' THEN COALESCE(amount_paid, 0)
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
        
        // Checked In Today (bookings with status 'checked_in' and check_in_date = today)
        const [arrRow] = await pool.query(`SELECT COUNT(*) as arrivals FROM bookings WHERE hotel_id = ? AND booking_status = 'checked_in' AND check_in_date = CURDATE()`, [hotelId]);
        
        // Checked Out Today (bookings with status 'checked_out' and check_out_date = today)
        const [depRow] = await pool.query(`SELECT COUNT(*) as departures FROM bookings WHERE hotel_id = ? AND booking_status = 'checked_out' AND check_out_date = CURDATE()`, [hotelId]);

        // 7-Day Revenue Trend
        const [revTrendRows] = await pool.query(`
            SELECT 
                DATE_FORMAT(d.dt, '%a') as day_name,
                COALESCE(SUM(b.total_amount), 0) as daily_revenue
            FROM (
                SELECT CURDATE() - INTERVAL 6 DAY as dt UNION ALL
                SELECT CURDATE() - INTERVAL 5 DAY UNION ALL
                SELECT CURDATE() - INTERVAL 4 DAY UNION ALL
                SELECT CURDATE() - INTERVAL 3 DAY UNION ALL
                SELECT CURDATE() - INTERVAL 2 DAY UNION ALL
                SELECT CURDATE() - INTERVAL 1 DAY UNION ALL
                SELECT CURDATE()
            ) d
            LEFT JOIN bookings b ON b.hotel_id = ? 
                AND b.booking_status != 'cancelled'
                AND b.check_in_date = d.dt
            GROUP BY d.dt
            ORDER BY d.dt ASC
        `, [hotelId]);

        // Occupancy by room type (real-time for active stays today)
        const [occRows] = await pool.query(`
            SELECT 
                r.id,
                r.name,
                r.total_rooms,
                COUNT(b.id) as active_bookings
            FROM room_types r
            LEFT JOIN bookings b ON b.room_type_id = r.id 
                AND b.hotel_id = r.hotel_id 
                AND b.booking_status NOT IN ('cancelled')
                AND b.check_in_date <= CURDATE() 
                AND b.check_out_date > CURDATE()
            WHERE r.hotel_id = ?
            GROUP BY r.id, r.name, r.total_rooms
        `, [hotelId]);

        const revenueTrend = {
            labels: revTrendRows.map(r => r.day_name),
            values: revTrendRows.map(r => parseFloat(r.daily_revenue) || 0)
        };

        const occupancyByRoomType = {
            labels: occRows.map(r => r.name),
            values: occRows.map(r => r.total_rooms > 0 ? Math.round((r.active_bookings / r.total_rooms) * 100) : 0)
        };

        res.json({
            revenue: parseFloat(revRow[0].revenue) || 0,
            expectedRevenue: parseFloat(expectedRevRow[0].expected_revenue) || 0,
            totalBookings: bkRow[0].total_bookings || 0,
            arrivalsToday: arrRow[0].arrivals || 0,
            departuresToday: depRow[0].departures || 0,
            revenueTrend,
            occupancyByRoomType
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
