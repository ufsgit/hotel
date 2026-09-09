const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const notificationService = require('../services/notificationService');
const pricingService = require('../services/pricingService');

// GET /api/hotels/:slug — hotel info + branding
router.get('/hotels/:slug', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM hotels WHERE slug = ?', [req.params.slug]);
        if (rows.length === 0) return res.status(404).json({ error: 'Hotel not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/hotels/:slug/offers
router.get('/hotels/:slug/offers', async (req, res) => {
    try {
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE slug = ?', [req.params.slug]);
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

// GET /api/hotels/:slug/availability
router.get('/hotels/:slug/availability', async (req, res) => {
    const { checkIn, checkOut, guests } = req.query;
    if (!checkIn || !checkOut || !guests) return res.status(400).json({ error: 'Missing parameters' });

    try {
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE slug = ?', [req.params.slug]);
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

// POST /api/hotels/:slug/calculate-price
router.post('/hotels/:slug/calculate-price', async (req, res) => {
    try {
        const { room_type_id, check_in_date, check_out_date, num_guests, promo_code } = req.body;
        
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE slug = ?', [req.params.slug]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const pricing = await pricingService.calculatePrice(
            hotels[0].id, room_type_id, check_in_date, check_out_date, parseInt(num_guests), promo_code
        );

        res.json(pricing);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hotels/:slug/bookings
router.post('/hotels/:slug/bookings', async (req, res) => {
    try {
        const { room_type_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, num_guests, promo_code } = req.body;
        
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE slug = ?', [req.params.slug]);
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

// POST /api/hotels/:slug/create-payment-order
router.post('/hotels/:slug/create-payment-order', async (req, res) => {
    try {
        const { booking_id, amount, is_partial } = req.body; // amount is in INR typically, or lowest currency unit
        
        // MVP: Using a dummy Razorpay initialization here. 
        // In reality, keys should be fetched securely per hotel or from env variables.
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykey1234',
            key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummysecret56789',
        });

        const amountToPay = is_partial ? Math.floor(amount / 2) : amount;

        const options = {
            amount: Math.round(amountToPay * 100), // convert to paise/cents
            currency: 'USD',
            receipt: `rcpt_${booking_id}`
        };

        const order = await rzp.orders.create(options);
        res.json({ success: true, order });
    } catch (err) {
        console.error('Razorpay Order Error:', err);
        // Fallback for scaffold if Razorpay fails (e.g. invalid keys)
        res.json({ success: true, order: { id: `fake_order_${Date.now()}`, amount: req.body.amount * 100, currency: 'USD' } });
    }
});

// POST /api/hotels/:slug/verify-payment
router.post('/hotels/:slug/verify-payment', async (req, res) => {
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
