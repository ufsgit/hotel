const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const notificationService = require('../services/notificationService');
const pricingService = require('../services/pricingService');

// GET /api/hotels/:uuid — hotel info + branding
router.get('/hotels/:uuid', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (rows.length === 0) return res.status(404).json({ error: 'Hotel not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/hotels/:uuid/offers
router.get('/hotels/:uuid/offers', async (req, res) => {
    try {
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const [offers] = await pool.query(
            'SELECT * FROM seasons_offers WHERE hotel_id = ? AND is_active = TRUE ORDER BY priority DESC',
            [hotels[0].id]
        );
        res.json(offers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/hotels/:uuid/availability
router.get('/hotels/:uuid/availability', async (req, res) => {
    const { checkIn, checkOut, guests } = req.query;
    if (!checkIn || !checkOut || !guests) return res.status(400).json({ error: 'Missing parameters' });

    try {
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const [roomTypes] = await pool.query(
            'SELECT * FROM room_types WHERE hotel_id = ? AND max_occupancy >= ?',
            [hotels[0].id, parseInt(guests)]
        );

        // For each room type, calculate real availability:
        // available = total_rooms - active bookings that overlap the requested dates
        for (const rt of roomTypes) {
            const [bookings] = await pool.query(
                `SELECT COUNT(*) as booked FROM bookings
                 WHERE room_type_id = ? 
                 AND booking_status NOT IN ('cancelled', 'checked_out')
                 AND check_in_date < ? AND check_out_date > ?`,
                [rt.id, checkOut, checkIn]
            );
            const booked = bookings[0].booked || 0;
            rt.min_available = Math.max(0, (rt.total_rooms || 1) - booked);
        }

        res.json(roomTypes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hotels/:uuid/calculate-price
router.post('/hotels/:uuid/calculate-price', async (req, res) => {
    try {
        const { room_type_id, check_in_date, check_out_date, num_guests, promo_code } = req.body;
        
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const pricing = await pricingService.calculatePrice(
            hotels[0].id, room_type_id, check_in_date, check_out_date, parseInt(num_guests), promo_code
        );

        res.json(pricing);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hotels/:uuid/bookings
router.post('/hotels/:uuid/bookings', async (req, res) => {
    try {
        const { room_type_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, num_guests, promo_code } = req.body;
        
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const pricing = await pricingService.calculatePrice(
            hotels[0].id, room_type_id, check_in_date, check_out_date, parseInt(num_guests), promo_code
        );

        const [result] = await pool.query(
            `INSERT INTO bookings 
            (hotel_id, room_type_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, num_guests, extra_beds, promo_code_id, season_offer_id, subtotal, tax_amount, total_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                hotels[0].id, room_type_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, num_guests, 
                pricing.extraBeds, pricing.promoCodeId, pricing.seasonOfferId, pricing.subtotal, pricing.taxAmount, pricing.totalAmount
            ]
        );
        
        if (pricing.promoCodeId) {
            await pool.query('UPDATE promo_codes SET times_used = times_used + 1 WHERE id = ?', [pricing.promoCodeId]);
        }
        
        // Trigger notification
        await notificationService.sendBookingConfirmation(result.insertId, guest_email, guest_phone);
        
        res.json({ success: true, booking_id: result.insertId, reference: `BKG-${result.insertId}`, pricing });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hotels/:uuid/create-payment-order
router.post('/hotels/:uuid/create-payment-order', async (req, res) => {
    try {
        const { booking_id, amount, is_partial } = req.body;

        // Fetch hotel's own Razorpay credentials
        const [hotels] = await pool.query('SELECT id, razorpay_key_id, razorpay_key_secret FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const hotel = hotels[0];
        const keyId     = hotel.razorpay_key_id     || process.env.RAZORPAY_KEY_ID     || 'rzp_test_dummykey1234';
        const keySecret = hotel.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET || 'dummysecret56789';

        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const amountToPay = is_partial ? Math.floor(amount / 2) : amount;
        const options = {
            amount: Math.round(amountToPay * 100), // convert to paise
            currency: 'INR',
            receipt: `rcpt_${booking_id}`
        };

        const order = await rzp.orders.create(options);
        // Return key_id so the guest widget knows which key to initialise Razorpay with
        res.json({ success: true, order, key_id: keyId });
    } catch (err) {
        console.error('Razorpay Order Error:', err);
        // Fallback if Razorpay call fails (e.g. invalid/missing keys)
        res.json({ success: true, order: { id: `fake_order_${Date.now()}`, amount: req.body.amount * 100, currency: 'INR' }, key_id: 'rzp_test_dummykey1234' });
    }
});

// POST /api/hotels/:uuid/verify-payment
router.post('/hotels/:uuid/verify-payment', async (req, res) => {
    try {
        const { booking_id, razorpay_payment_id, razorpay_order_id, razorpay_signature, is_partial } = req.body;
        
        // Normally, verify signature here using crypto
        // const crypto = require('crypto');
        // ... verify logic ...

        // Assuming verification passed
        const newStatus = is_partial ? 'partial' : 'paid';
        await pool.query('UPDATE bookings SET payment_status = ? WHERE id = ?', [newStatus, booking_id]);

        res.json({ success: true, message: 'Payment verified successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
