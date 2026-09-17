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

// Multer config — store guest documents in /uploads/documents/
const docStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/documents');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `guest_doc_${Date.now()}${ext}`);
    }
});
const uploadDoc = multer({
    storage: docStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB for documents
    fileFilter: (req, file, cb) => {
        // Allow images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only image and PDF files are allowed'));
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
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin dashboard routes (protected by auth middleware)
router.use(auth);

router.get('/my-hotels', async (req, res) => {
    try {
        const [hotels] = await pool.query(`
            SELECT h.id, h.name, h.slug, h.branding_primary_color, uh.role, uh.permissions 
            FROM hotels h
            JOIN user_hotels uh ON h.id = uh.hotel_id
            WHERE uh.user_id = ?
            ORDER BY h.name ASC
        `, [req.user.id]);
        res.json(hotels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
// --- STAFF MANAGEMENT (For Hotel Owners) ---
router.get('/staff', async (req, res) => {
    try {
        if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can manage staff.' });
        
        const [rows] = await pool.query(`
            SELECT u.id, u.name, u.email, uh.role, uh.permissions, uh.created_at 
            FROM users u
            JOIN user_hotels uh ON u.id = uh.user_id
            WHERE uh.hotel_id = ? 
            ORDER BY uh.role, u.name
        `, [req.user.hotel_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/staff', async (req, res) => {
    try {
        const { name, email, password, target_hotel_id, permissions } = req.body;
        const hotelId = target_hotel_id || req.user.hotel_id;

        // Ensure user is an owner for the requested hotel
        const [rows] = await pool.query('SELECT role FROM user_hotels WHERE user_id = ? AND hotel_id = ?', [req.user.id, hotelId]);
        if (rows.length === 0 || rows[0].role !== 'owner') {
            return res.status(403).json({ error: 'Only owners can add staff to this property.' });
        }
        
        if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required.' });

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        let userId;

        if (existing.length > 0) {
            userId = existing[0].id;
        } else {
            const password_hash = await bcrypt.hash(password, 10);
            const [result] = await pool.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [name, email, password_hash, 'user']
            );
            userId = result.insertId;
        }

        await pool.query(
            'INSERT IGNORE INTO user_hotels (user_id, hotel_id, role, permissions) VALUES (?, ?, ?, ?)',
            [userId, hotelId, 'staff', permissions ? JSON.stringify(permissions) : null]
        );

        res.status(201).json({ message: 'Staff added successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/staff/:id', async (req, res) => {
    try {
        if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can remove staff.' });
        
        const targetUserId = parseInt(req.params.id);
        if (targetUserId === req.user.id) return res.status(400).json({ error: 'You cannot remove yourself.' });

        await pool.query('DELETE FROM user_hotels WHERE user_id = ? AND hotel_id = ?', [targetUserId, req.user.hotel_id]);
        res.json({ message: 'Staff removed successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/staff/:id', async (req, res) => {
    try {
        if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can edit staff.' });
        
        const targetUserId = parseInt(req.params.id);
        const { name, email, role, password, permissions, target_hotel_id } = req.body;
        console.log('PUT /staff/:id payload:', req.body);
        
        // Ensure the target user actually belongs to this hotel
        const [rows] = await pool.query('SELECT * FROM user_hotels WHERE user_id = ? AND hotel_id = ?', [targetUserId, req.user.hotel_id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Staff member not found in this property.' });

        // Update the user's name, email, and optionally password
        if (name || email || password) {
            let query = 'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email)';
            const params = [name, email];
            if (password) {
                const password_hash = await bcrypt.hash(password, 10);
                query += ', password_hash = ?';
                params.push(password_hash);
            }
            query += ' WHERE id = ?';
            params.push(targetUserId);
            await pool.query(query, params);
        }
        
        // Update their role, permissions, and hotel assignment
        if (role || permissions !== undefined || target_hotel_id) {
            // Prevent changing own role if they are the last owner, but for now just prevent changing own role entirely
            if (targetUserId === req.user.id && role && role !== 'owner') {
                return res.status(400).json({ error: 'You cannot downgrade your own role.' });
            }
            
            let uhQuery = 'UPDATE user_hotels SET ';
            const uhParams = [];
            const uhSet = [];
            
            if (role && (role === 'owner' || role === 'staff')) {
                uhSet.push('role = ?');
                uhParams.push(role);
            }
            
            if (permissions !== undefined) {
                uhSet.push('permissions = ?');
                uhParams.push(permissions ? JSON.stringify(permissions) : null);
            }
            
            if (target_hotel_id && parseInt(target_hotel_id) !== req.user.hotel_id) {
                // Ensure the owner actually owns the target property
                const [targetCheck] = await pool.query('SELECT role FROM user_hotels WHERE user_id = ? AND hotel_id = ?', [req.user.id, target_hotel_id]);
                if (targetCheck.length === 0 || targetCheck[0].role !== 'owner') {
                    return res.status(403).json({ error: 'You do not have owner access to the target property.' });
                }
                uhSet.push('hotel_id = ?');
                uhParams.push(target_hotel_id);
            }
            
            if (uhSet.length > 0) {
                uhQuery += uhSet.join(', ') + ' WHERE user_id = ? AND hotel_id = ?';
                uhParams.push(targetUserId, req.user.hotel_id);
                try {
                    await pool.query(uhQuery, uhParams);
                } catch (e) {
                    if (e.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ error: 'This user is already assigned to the target property.' });
                    }
                    throw e;
                }
            }
        }

        res.json({ message: 'Staff member updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GUEST DOCUMENT UPLOAD ---
router.post('/upload-guest-document/:bookingId', uploadDoc.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const bookingId = req.params.bookingId;
        
        // Verify booking belongs to this hotel
        const [bookings] = await pool.query('SELECT id FROM bookings WHERE id = ? AND hotel_id = ?', [bookingId, req.user.hotel_id]);
        if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const host = req.get('host');
        const protocol = req.protocol;
        const docUrl = `${protocol}://${host}/uploads/documents/${req.file.filename}`;
        
        await pool.query('UPDATE bookings SET guest_document_url = ? WHERE id = ?', [docUrl, bookingId]);
        res.json({ url: docUrl });
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';

        let baseQuery = `
            FROM bookings b 
            LEFT JOIN room_types rt ON b.room_type_id = rt.id 
            WHERE b.hotel_id = ?
        `;
        const params = [req.user.hotel_id];

        if (status) {
            baseQuery += ` AND b.booking_status = ?`;
            params.push(status);
        }

        if (search.trim()) {
            baseQuery += ` AND (b.guest_name LIKE ? OR b.id = ?)`;
            params.push(`%${search}%`, search.replace(/\D/g, '') || -1); // Extract numbers for ID search
        }

        const [countResult] = await pool.query(`SELECT COUNT(*) as total ${baseQuery}`, params);
        const total = countResult[0].total;

        const [bookings] = await pool.query(`
            SELECT b.*, rt.name as room_type_name,
            (SELECT COALESCE(SUM(amount), 0) FROM booking_expenses WHERE booking_id = b.id) as total_expenses,
            (SELECT COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN amount WHEN payment_status = 'partial' THEN amount - COALESCE(amount_paid, 0) ELSE 0 END), 0) FROM booking_expenses WHERE booking_id = b.id) as unpaid_expenses
            ${baseQuery}
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        res.json({
            data: bookings,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/bookings/:id/status', async (req, res) => {
    try {
        const { booking_status, payment_status, amount_paid } = req.body;
        const bookingId = req.params.id;

        // Get old status
        const [oldRows] = await pool.query('SELECT booking_status, payment_status FROM bookings WHERE id = ? AND hotel_id = ?', [bookingId, req.user.hotel_id]);
        if (oldRows.length === 0) return res.status(404).json({ error: 'Booking not found' });
        const oldData = oldRows[0];

        // Build dynamic SET clause
        const fields = [];
        const values = [];
        if (booking_status !== undefined) { fields.push('booking_status = ?'); values.push(booking_status); }
        if (payment_status !== undefined) { fields.push('payment_status = ?'); values.push(payment_status); }
        if (amount_paid !== undefined)    { fields.push('amount_paid = ?');    values.push(amount_paid); }

        if (fields.length > 0) {
            values.push(bookingId, req.user.hotel_id);
            await pool.query(
                `UPDATE bookings SET ${fields.join(', ')} WHERE id = ? AND hotel_id = ?`,
                values
            );
            
            // Insert history logs
            if (booking_status !== undefined && booking_status !== oldData.booking_status) {
                await pool.query(
                    'INSERT INTO booking_history (booking_id, changed_by, status_type, old_status, new_status) VALUES (?, ?, ?, ?, ?)',
                    [bookingId, req.user.id, 'booking', oldData.booking_status, booking_status]
                );
            }
            if (payment_status !== undefined && payment_status !== oldData.payment_status) {
                await pool.query(
                    'INSERT INTO booking_history (booking_id, changed_by, status_type, old_status, new_status) VALUES (?, ?, ?, ?, ?)',
                    [bookingId, req.user.id, 'payment', oldData.payment_status, payment_status]
                );
            }
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

router.get('/bookings/:id/history', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT h.*, u.name as changed_by_name
            FROM booking_history h
            LEFT JOIN users u ON h.changed_by = u.id
            JOIN bookings b ON h.booking_id = b.id
            WHERE h.booking_id = ? AND b.hotel_id = ?
            ORDER BY h.changed_at DESC
        `, [req.params.id, req.user.hotel_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BOOKING EXPENSES ---
router.get('/bookings/:id/expenses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM booking_expenses WHERE booking_id = ? AND hotel_id = ? ORDER BY created_at DESC', [req.params.id, req.user.hotel_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/bookings/:id/expenses', async (req, res) => {
    try {
        const { expense_type, amount, description } = req.body;
        await pool.query(
            'INSERT INTO booking_expenses (booking_id, hotel_id, expense_type, amount, description) VALUES (?, ?, ?, ?, ?)',
            [req.params.id, req.user.hotel_id, expense_type, amount, description]
        );
        res.json({ message: 'Expense added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/bookings/:id/expenses/:expenseId/status', async (req, res) => {
    try {
        const { payment_status, amount_paid } = req.body;
        await pool.query(
            'UPDATE booking_expenses SET payment_status = ?, amount_paid = ? WHERE id = ? AND booking_id = ? AND hotel_id = ?',
            [payment_status, amount_paid || 0, req.params.expenseId, req.params.id, req.user.hotel_id]
        );
        res.json({ message: 'Expense status updated' });
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
        
        // Ensure default_capacity has a fallback
        const defCap = default_capacity || 2;
        // Compute maxOcc dynamically: default_capacity + 1 if extra_bed_allowed is true
        const maxOcc = defCap + (extra_bed_allowed ? 1 : 0);

        let photosJson = null;
        if (photos) {
            photosJson = JSON.stringify(Array.isArray(photos) ? photos : [photos]);
        }
        let amenitiesJson = null;
        if (amenities) {
            amenitiesJson = JSON.stringify(Array.isArray(amenities) ? amenities : [amenities]);
        }
        const [result] = await pool.query(
            'INSERT INTO room_types (hotel_id, name, description, default_capacity, base_price, max_occupancy, extra_bed_allowed, extra_bed_price, total_rooms, photos, amenities) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.hotel_id, name || '', description || '', defCap, base_price || 0, maxOcc, extra_bed_allowed ? 1 : 0, extra_bed_price || 0, total_rooms || 10, photosJson, amenitiesJson]
        );
        res.json({ id: result.insertId, message: 'Room type created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/room-types/:id', async (req, res) => {
    try {
        const { name, description, base_price, default_capacity, max_capacity, max_occupancy, extra_bed_allowed, extra_bed_price, total_rooms, photos, amenities } = req.body;
        
        const defCap = default_capacity || 2;
        const maxOcc = defCap + (extra_bed_allowed ? 1 : 0);

        let photosJson = null;
        if (photos) {
            photosJson = JSON.stringify(Array.isArray(photos) ? photos : [photos]);
        }
        let amenitiesJson = null;
        if (amenities !== undefined) {
            amenitiesJson = JSON.stringify(Array.isArray(amenities) ? amenities : (amenities ? [amenities] : []));
        }
        await pool.query(
            'UPDATE room_types SET name = ?, description = ?, default_capacity = ?, base_price = ?, max_occupancy = ?, extra_bed_allowed = ?, extra_bed_price = ?, total_rooms = COALESCE(?, total_rooms), photos = COALESCE(?, photos), amenities = COALESCE(?, amenities) WHERE id = ? AND hotel_id = ?',
            [name, description || '', defCap, base_price || 0, maxOcc, extra_bed_allowed ? 1 : 0, extra_bed_price || 0, total_rooms, photosJson, amenitiesJson, req.params.id, req.user.hotel_id]
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
        const range = req.query.range || '7d';
        
        let dateFilter = '';
        let dateFilterParams = [];
        
        if (range === 'today') {
            dateFilter = 'AND DATE(created_at) = CURDATE()';
        } else if (range === '7d') {
            dateFilter = 'AND created_at >= CURDATE() - INTERVAL 6 DAY';
        } else if (range === '30d') {
            dateFilter = 'AND created_at >= CURDATE() - INTERVAL 29 DAY';
        }
        
        // Collected Revenue: only paid or partial bookings
        const [revRow] = await pool.query(
            `SELECT COALESCE(SUM(CASE 
                WHEN payment_status = 'paid' THEN total_amount 
                WHEN payment_status = 'partial' THEN COALESCE(amount_paid, 0)
                ELSE 0 
            END), 0) as revenue FROM bookings WHERE hotel_id = ? AND booking_status != 'cancelled' ${dateFilter}`,
            [hotelId, ...dateFilterParams]
        );

        // Expected Revenue: all non-cancelled bookings
        const [expectedRevRow] = await pool.query(
            `SELECT COALESCE(SUM(total_amount), 0) as expected_revenue FROM bookings WHERE hotel_id = ? AND booking_status != 'cancelled' ${dateFilter}`,
            [hotelId, ...dateFilterParams]
        );

        // Expenses Revenue
        const [expRow] = await pool.query(
            `SELECT COALESCE(SUM(CASE 
                WHEN payment_status = 'paid' THEN amount 
                WHEN payment_status = 'partial' THEN COALESCE(amount_paid, 0)
                ELSE 0 
            END), 0) as expenses_revenue FROM booking_expenses WHERE hotel_id = ? ${dateFilter}`,
            [hotelId, ...dateFilterParams]
        );

        const [expectedExpRow] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as expected_expenses_revenue FROM booking_expenses WHERE hotel_id = ? ${dateFilter}`,
            [hotelId, ...dateFilterParams]
        );
        
        // Total bookings
        const [bkRow] = await pool.query(`SELECT COUNT(*) as total_bookings FROM bookings WHERE hotel_id = ? ${dateFilter}`, [hotelId, ...dateFilterParams]);
        
        // Checked In Today (always today)
        const [arrRow] = await pool.query(`SELECT COUNT(*) as arrivals FROM bookings WHERE hotel_id = ? AND booking_status = 'checked_in' AND check_in_date = CURDATE()`, [hotelId]);
        
        // Checked Out Today (always today)
        const [depRow] = await pool.query(`SELECT COUNT(*) as departures FROM bookings WHERE hotel_id = ? AND booking_status = 'checked_out' AND check_out_date = CURDATE()`, [hotelId]);

        // Revenue Trend
        let trendQuery = '';
        if (range === 'today') {
            trendQuery = `
                SELECT 
                    HOUR(created_at) as time_key,
                    DATE_FORMAT(created_at, '%h %p') as display_label,
                    COALESCE(SUM(total_amount), 0) as daily_revenue
                FROM bookings
                WHERE hotel_id = ? AND booking_status != 'cancelled' ${dateFilter}
                GROUP BY HOUR(created_at), DATE_FORMAT(created_at, '%h %p')
                ORDER BY HOUR(created_at) ASC
            `;
        } else if (range === 'all') {
            trendQuery = `
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as time_key,
                    DATE_FORMAT(created_at, '%b %Y') as display_label,
                    COALESCE(SUM(total_amount), 0) as daily_revenue
                FROM bookings
                WHERE hotel_id = ? AND booking_status != 'cancelled'
                GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
                ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
            `;
        } else {
            // 7d or 30d
            trendQuery = `
                SELECT 
                    DATE(created_at) as time_key,
                    DATE_FORMAT(created_at, '%b %d') as display_label,
                    COALESCE(SUM(total_amount), 0) as daily_revenue
                FROM bookings
                WHERE hotel_id = ? AND booking_status != 'cancelled' ${dateFilter}
                GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%b %d')
                ORDER BY DATE(created_at) ASC
            `;
        }

        const [trendRowsRaw] = await pool.query(trendQuery, [hotelId, ...dateFilterParams]);
        
        let revenueTrend = { labels: [], values: [] };
        
        if (range === '7d' || range === '30d') {
            // Fill missing days
            const numDays = range === '7d' ? 7 : 30;
            const dataMap = new Map();
            trendRowsRaw.forEach(r => dataMap.set(new Date(r.time_key).toISOString().split('T')[0], parseFloat(r.daily_revenue)));
            
            for (let i = numDays - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const isoDate = d.toISOString().split('T')[0];
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                revenueTrend.labels.push(label);
                revenueTrend.values.push(dataMap.get(isoDate) || 0);
            }
        } else if (range === 'today') {
            // Fill missing hours
            const currentHour = new Date().getHours();
            const dataMap = new Map();
            trendRowsRaw.forEach(r => dataMap.set(parseInt(r.time_key), parseFloat(r.daily_revenue)));
            
            for (let i = 0; i <= currentHour; i++) {
                const d = new Date();
                d.setHours(i);
                const label = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
                revenueTrend.labels.push(label);
                revenueTrend.values.push(dataMap.get(i) || 0);
            }
            if (revenueTrend.labels.length === 0) {
                revenueTrend = { labels: ['No Data'], values: [0] };
            }
        } else if (range === 'all') {
            // Just use what's returned for months
            revenueTrend.labels = trendRowsRaw.map(r => r.display_label);
            revenueTrend.values = trendRowsRaw.map(r => parseFloat(r.daily_revenue));
            if (revenueTrend.labels.length === 0) {
                revenueTrend = { labels: ['No Data'], values: [0] };
            }
        }

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

        const occupancyByRoomType = {
            labels: occRows.map(r => r.name),
            values: occRows.map(r => r.total_rooms > 0 ? Math.round((r.active_bookings / r.total_rooms) * 100) : 0)
        };

        // Expenses Distribution
        const [expDistRows] = await pool.query(`
            SELECT expense_type, COALESCE(SUM(amount), 0) as total
            FROM booking_expenses
            WHERE hotel_id = ? ${dateFilter}
            GROUP BY expense_type
        `, [hotelId, ...dateFilterParams]);

        const expenseDistribution = {
            labels: expDistRows.map(r => r.expense_type),
            values: expDistRows.map(r => parseFloat(r.total))
        };

        // Advanced Metrics
        const [advancedRows] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN booking_status = 'cancelled' THEN 1 END) as cancelled_bookings,
                COALESCE(AVG(DATEDIFF(check_out_date, check_in_date)), 0) as alos,
                COALESCE(SUM(total_amount) / NULLIF(SUM(DATEDIFF(check_out_date, check_in_date)), 0), 0) as adr
            FROM bookings 
            WHERE hotel_id = ? ${dateFilter}
        `, [hotelId, ...dateFilterParams]);

        // Room Type Profitability
        const [profRows] = await pool.query(`
            SELECT 
                r.name,
                COALESCE(SUM(b.total_amount), 0) as revenue
            FROM room_types r
            LEFT JOIN bookings b ON b.room_type_id = r.id AND b.hotel_id = r.hotel_id AND b.booking_status != 'cancelled' ${dateFilter.replace('created_at', 'b.created_at')}
            WHERE r.hotel_id = ?
            GROUP BY r.id, r.name
        `, [hotelId, ...dateFilterParams, hotelId]);
        
        const roomTypeProfitability = {
            labels: profRows.map(r => r.name),
            values: profRows.map(r => parseFloat(r.revenue))
        };

        res.json({
            revenue: (parseFloat(revRow[0].revenue) || 0) + (parseFloat(expRow[0].expenses_revenue) || 0),
            roomRevenue: parseFloat(revRow[0].revenue) || 0,
            expensesRevenue: parseFloat(expRow[0].expenses_revenue) || 0,
            expectedRevenue: (parseFloat(expectedRevRow[0].expected_revenue) || 0) + (parseFloat(expectedExpRow[0].expected_expenses_revenue) || 0),
            expectedRoomRevenue: parseFloat(expectedRevRow[0].expected_revenue) || 0,
            expectedExpensesRevenue: parseFloat(expectedExpRow[0].expected_expenses_revenue) || 0,
            totalBookings: bkRow[0].total_bookings || 0,
            arrivalsToday: arrRow[0].arrivals || 0,
            departuresToday: depRow[0].departures || 0,
            cancelledBookings: advancedRows[0].cancelled_bookings || 0,
            alos: parseFloat(advancedRows[0].alos).toFixed(1) || 0,
            adr: parseFloat(advancedRows[0].adr).toFixed(2) || 0,
            revenueTrend,
            occupancyByRoomType,
            expenseDistribution,
            roomTypeProfitability
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/reports/stat-details', async (req, res) => {
    try {
        const hotelId = req.user.hotel_id;
        const metric = req.query.metric;
        const range = req.query.range || '7d';

        let dateFilter = '';
        let dateFilterParams = [];

        if (range === 'today') {
            dateFilter = 'AND DATE(b.created_at) = CURDATE()';
        } else if (range === '7d') {
            dateFilter = 'AND b.created_at >= CURDATE() - INTERVAL 6 DAY';
        } else if (range === '30d') {
            dateFilter = 'AND b.created_at >= CURDATE() - INTERVAL 29 DAY';
        }

        let query = `
            SELECT b.*, rt.name as room_type_name 
            FROM bookings b
            LEFT JOIN room_types rt ON b.room_type_id = rt.id
            WHERE b.hotel_id = ? 
        `;
        let params = [hotelId, ...dateFilterParams];

        if (metric === 'revenue') {
            query += ` AND b.booking_status != 'cancelled' AND b.payment_status IN ('paid', 'partial') ${dateFilter} ORDER BY b.created_at DESC`;
        } else if (metric === 'bookings') {
            query += ` AND b.booking_status != 'cancelled' ${dateFilter} ORDER BY b.created_at DESC`;
        } else if (metric === 'arrivals') {
            query += ` AND b.booking_status = 'checked_in' AND b.check_in_date = CURDATE() ORDER BY b.created_at DESC`;
        } else if (metric === 'departures') {
            query += ` AND b.booking_status = 'checked_out' AND b.check_out_date = CURDATE() ORDER BY b.created_at DESC`;
        } else {
            return res.status(400).json({ error: 'Invalid metric' });
        }

        const [bookings] = await pool.query(query, params);
        res.json(bookings);
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

// --- PROMO CODES CRUD ---

router.get('/promo-codes', async (req, res) => {
    try {
        const [promoCodes] = await pool.query(
            'SELECT * FROM promo_codes WHERE hotel_id = ? ORDER BY id DESC',
            [req.user.hotel_id]
        );
        res.json(promoCodes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/promo-codes', async (req, res) => {
    try {
        const { code, discount_type, discount_value, valid_from, valid_to, max_uses, is_active } = req.body;
        const [result] = await pool.query(
            `INSERT INTO promo_codes (hotel_id, code, discount_type, discount_value, valid_from, valid_to, max_uses, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.hotel_id, code, discount_type, discount_value, valid_from, valid_to, max_uses || null, is_active === undefined ? true : is_active]
        );
        res.json({ id: result.insertId, message: 'Promo code created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/promo-codes/:id', async (req, res) => {
    try {
        const { code, discount_type, discount_value, valid_from, valid_to, max_uses, is_active } = req.body;
        await pool.query(
            `UPDATE promo_codes SET code=?, discount_type=?, discount_value=?, valid_from=?, valid_to=?, max_uses=?, is_active=?
             WHERE id=? AND hotel_id=?`,
            [code, discount_type, discount_value, valid_from, valid_to, max_uses || null, is_active, req.params.id, req.user.hotel_id]
        );
        res.json({ message: 'Promo code updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/promo-codes/:id/toggle', async (req, res) => {
    try {
        await pool.query(
            'UPDATE promo_codes SET is_active = NOT is_active WHERE id = ? AND hotel_id = ?',
            [req.params.id, req.user.hotel_id]
        );
        res.json({ message: 'Promo code toggled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/promo-codes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM promo_codes WHERE id = ? AND hotel_id = ?', [req.params.id, req.user.hotel_id]);
        res.json({ message: 'Promo code deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- HOTEL SETTINGS ---

router.get('/hotel-settings', async (req, res) => {
    try {
        // Super admins don't belong to a hotel — return a platform placeholder
        if (req.user.role === 'super_admin') {
            return res.json({ name: 'Platform Admin', branding_logo_url: null, branding_primary_color: '#6366f1' });
        }
        const [rows] = await pool.query(
            'SELECT name, uuid, slug, address, contact_email, contact_phone, branding_logo_url, branding_primary_color, timezone, tax_rate, razorpay_key_id, razorpay_key_secret FROM hotels WHERE id = ?',
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
        const { name, address, contact_email, contact_phone, branding_logo_url, branding_primary_color, timezone, tax_rate, razorpay_key_id, razorpay_key_secret } = req.body;
        await pool.query(
            `UPDATE hotels SET
                name = COALESCE(?, name),
                address = COALESCE(?, address),
                contact_email = COALESCE(?, contact_email),
                contact_phone = COALESCE(?, contact_phone),
                branding_logo_url = COALESCE(?, branding_logo_url),
                branding_primary_color = COALESCE(?, branding_primary_color),
                timezone = COALESCE(?, timezone),
                tax_rate = COALESCE(?, tax_rate),
                razorpay_key_id = COALESCE(?, razorpay_key_id),
                razorpay_key_secret = COALESCE(?, razorpay_key_secret)
             WHERE id = ?`,
            [name, address, contact_email, contact_phone, branding_logo_url, branding_primary_color, timezone, tax_rate ?? null, razorpay_key_id ?? null, razorpay_key_secret ?? null, req.user.hotel_id]
        );
        res.json({ message: 'Hotel settings updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
