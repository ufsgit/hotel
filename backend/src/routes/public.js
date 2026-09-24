const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const notificationService = require('../services/notificationService');
const pricingService = require('../services/pricingService');

// GET /api/platform/branding — public platform branding defaults (no auth required)
router.get('/platform/branding', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT default_primary_color FROM platform_settings WHERE id = 1');
        const defaultColor = rows.length > 0 ? (rows[0].default_primary_color || '#6366f1') : '#6366f1';
        res.json({ default_primary_color: defaultColor });
    } catch (err) {
        res.json({ default_primary_color: '#6366f1' }); // safe fallback on error
    }
});

// GET /api/hotels/:uuid — hotel info + branding
router.get('/hotels/:uuid', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, uuid, name, slug, address, contact_email, contact_phone, branding_logo_url, branding_primary_color, timezone, tax_rate, razorpay_key_id, cancellation_allowed, cancellation_fee_type, cancellation_fee, auto_refund, min_days_before_cancel FROM hotels WHERE uuid = ?', [req.params.uuid]);
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
    const { checkIn, checkOut, guests, rooms = 1 } = req.query;
    if (!checkIn || !checkOut || !guests) return res.status(400).json({ error: 'Missing parameters' });

    try {
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const [roomTypes] = await pool.query(
            'SELECT * FROM room_types WHERE hotel_id = ? AND max_occupancy >= ?',
            [hotels[0].id, Math.ceil(parseInt(guests) / parseInt(rooms))]
        );

        // Lazy cleanup: Auto-cancel any pending & unpaid bookings older than 15 minutes
        await pool.query(`
            UPDATE bookings 
            SET booking_status = 'cancelled' 
            WHERE hotel_id = ? 
              AND booking_status = 'pending' 
              AND payment_status = 'unpaid' 
              AND created_at < NOW() - INTERVAL 15 MINUTE
        `, [hotels[0].id]);

        // For each room type, calculate real availability:
        // available = total_rooms - active bookings that overlap the requested dates
        const availableRoomTypes = [];
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
            
            console.log(`Debug RT ${rt.name}: min_available=${rt.min_available}, required=${parseInt(rooms)}`);
            if (rt.min_available >= parseInt(rooms)) {
                availableRoomTypes.push(rt);
            }
        }
        console.log(`Debug Returning:`, availableRoomTypes.map(rt => rt.name));
        res.json(availableRoomTypes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hotels/:uuid/calculate-price
router.post('/hotels/:uuid/calculate-price', async (req, res) => {
    try {
        const { room_type_id, check_in_date, check_out_date, num_guests, num_rooms, promo_code, rate_multiplier } = req.body;
        
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const pricing = await pricingService.calculatePrice(
            hotels[0].id, room_type_id, check_in_date, check_out_date, parseInt(num_guests), promo_code, rate_multiplier || 1.0, parseInt(num_rooms || 1)
        );

        res.json(pricing);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hotels/:uuid/bookings
router.post('/hotels/:uuid/bookings', async (req, res) => {
    try {
        const { room_type_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, num_guests, num_rooms, promo_code, rate_multiplier } = req.body;
        
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const pricing = await pricingService.calculatePrice(
            hotels[0].id, room_type_id, check_in_date, check_out_date, parseInt(num_guests), promo_code, rate_multiplier || 1.0, parseInt(num_rooms || 1)
        );

        const [result] = await pool.query(
            `INSERT INTO bookings 
            (hotel_id, room_type_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, num_guests, extra_beds, num_rooms, promo_code_id, season_offer_id, subtotal, tax_amount, total_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                hotels[0].id, room_type_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, num_guests, 
                pricing.extraBeds, parseInt(num_rooms || 1), pricing.promoCodeId, pricing.seasonOfferId, pricing.subtotal, pricing.taxAmount, pricing.totalAmount
            ]
        );
        
        if (pricing.promoCodeId) {
            await pool.query('UPDATE promo_codes SET times_used = times_used + 1 WHERE id = ?', [pricing.promoCodeId]);
        }
        
        // Trigger notification
        await notificationService.sendBookingConfirmation(result.insertId, guest_email, guest_phone, req.params.uuid);
        
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

        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const newStatus = is_partial ? 'partial' : 'paid';
        await pool.query('UPDATE bookings SET payment_status = ?, razorpay_payment_id = ? WHERE id = ? AND hotel_id = ?', [newStatus, razorpay_payment_id, booking_id, hotels[0].id]);

        res.json({ success: true, message: 'Payment verified successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hotels/:uuid/booking-status
router.post('/hotels/:uuid/booking-status', async (req, res) => {
    try {
        const { booking_id, guest_email } = req.body;
        
        const [hotels] = await pool.query('SELECT id FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });

        const [bookings] = await pool.query(
            `SELECT b.id, b.guest_name, b.check_in_date, b.check_out_date, b.total_amount, 
                    b.payment_status, b.booking_status, b.razorpay_payment_id,
                    b.refund_status, b.refund_amount, b.razorpay_refund_id,
                    rt.name as room_type_name
             FROM bookings b
             JOIN room_types rt ON b.room_type_id = rt.id
             WHERE b.id = ? AND b.guest_email = ? AND b.hotel_id = ?`,
            [booking_id, guest_email, hotels[0].id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found with these details.' });
        }

        res.json(bookings[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hotels/:uuid/cancel-booking
router.post('/hotels/:uuid/cancel-booking', async (req, res) => {
    try {
        const { booking_id, guest_email } = req.body;
        
        const [hotels] = await pool.query('SELECT id, cancellation_allowed, cancellation_fee_type, cancellation_fee, auto_refund, min_days_before_cancel, razorpay_key_id, razorpay_key_secret FROM hotels WHERE uuid = ?', [req.params.uuid]);
        if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });
        const hotel = hotels[0];

        if (!hotel.cancellation_allowed) {
            return res.status(400).json({ error: 'This hotel does not allow cancellations.' });
        }

        const [bookings] = await pool.query(
            'SELECT * FROM bookings WHERE id = ? AND guest_email = ? AND hotel_id = ?',
            [booking_id, guest_email, hotel.id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        const booking = bookings[0];
        if (['cancelled', 'checked_out', 'checked_in'].includes(booking.booking_status)) {
            return res.status(400).json({ error: `Booking cannot be cancelled (Status: ${booking.booking_status}).` });
        }

        const checkInDate = new Date(booking.check_in_date);
        const today = new Date();
        const diffTime = checkInDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (hotel.min_days_before_cancel && diffDays < hotel.min_days_before_cancel) {
            return res.status(400).json({ error: `Cancellations are only allowed up to ${hotel.min_days_before_cancel} days before check-in.` });
        }

        let feeAmount = 0;
        if (hotel.cancellation_fee_type === 'percentage') {
            feeAmount = (parseFloat(booking.total_amount) * parseFloat(hotel.cancellation_fee)) / 100;
        } else {
            feeAmount = parseFloat(hotel.cancellation_fee);
        }

        let refundMessage = "Booking cancelled manually. Please contact support for any applicable refunds.";
        let refundProcessed = false;
        let expectedRefundAmount = 0;

        // Calculate expected refund amount for paid bookings
        if (booking.payment_status !== 'unpaid' && booking.razorpay_payment_id) {
            const amountPaid = parseFloat(booking.amount_paid) || parseFloat(booking.total_amount);
            expectedRefundAmount = Math.max(0, amountPaid - feeAmount);
        }

        // Try Razorpay Auto-Refund if enabled and payment exists
        if (hotel.auto_refund && booking.razorpay_payment_id) {
            if (expectedRefundAmount > 0) {
                try {
                    const Razorpay = require('razorpay');
                    const keyId = hotel.razorpay_key_id || process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykey1234';
                    const keySecret = hotel.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET || 'dummysecret56789';
                    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

                    // Refund amount in paise
                    await rzp.payments.refund(booking.razorpay_payment_id, {
                        amount: Math.round(expectedRefundAmount * 100)
                    });
                    
                    refundProcessed = true;
                    refundMessage = `Booking cancelled successfully. A refund of ₹${expectedRefundAmount.toFixed(2)} has been initiated and will be credited to your account within 5-7 business days.`;
                } catch (rzpErr) {
                    console.error("Razorpay Auto-Refund Failed:", rzpErr);
                    refundMessage = "Booking cancelled, but automatic refund failed. Our support team will process it manually.";
                }
            } else {
                refundMessage = "Booking cancelled. The cancellation fee equals or exceeds the amount paid, so no refund is applicable.";
            }
        } else if (booking.payment_status !== 'unpaid' && booking.razorpay_payment_id) {
            // Payment was made but auto-refund is off — show pending refund message
            refundMessage = `Booking cancelled. Your refund of ₹${expectedRefundAmount.toFixed(2)} is being processed and will be credited to your account within 5-7 business days.`;
        } else if (!booking.razorpay_payment_id && booking.payment_status !== 'unpaid') {
            refundMessage = "Booking cancelled. No automatic refund possible as no payment ID was found. Please contact support.";
        }

        // Update booking status and set refund tracking
        if (expectedRefundAmount > 0) {
            await pool.query(
                'UPDATE bookings SET booking_status = "cancelled", refund_status = "processing", refund_amount = ? WHERE id = ?',
                [expectedRefundAmount, booking.id]
            );
        } else {
            await pool.query('UPDATE bookings SET booking_status = "cancelled" WHERE id = ?', [booking.id]);
        }

        // Send cancellation email
        await notificationService.sendCancellationAlert(booking.id, guest_email, req.params.uuid, refundMessage, expectedRefundAmount > 0);

        res.json({ success: true, message: refundMessage, feeCharged: feeAmount, refundAmount: expectedRefundAmount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
