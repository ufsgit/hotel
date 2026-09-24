const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const notificationService = require('../services/notificationService');

const router = express.Router();

// POST /api/webhooks/razorpay/:uuid
// Razorpay sends webhook events here for a specific hotel
router.post('/razorpay/:uuid', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const hotelUuid = req.params.uuid;
        const rawBody = req.body.toString('utf8');
        const razorpaySignature = req.headers['x-razorpay-signature'];

        if (!razorpaySignature) {
            console.error('[WEBHOOK] Missing x-razorpay-signature header');
            return res.status(400).json({ error: 'Missing signature' });
        }

        // Get hotel's webhook secret
        const [hotels] = await pool.query(
            'SELECT id, razorpay_webhook_secret FROM hotels WHERE uuid = ?',
            [hotelUuid]
        );

        if (hotels.length === 0) {
            console.error(`[WEBHOOK] Hotel not found: ${hotelUuid}`);
            return res.status(404).json({ error: 'Hotel not found' });
        }

        const hotel = hotels[0];
        const webhookSecret = hotel.razorpay_webhook_secret;

        if (!webhookSecret) {
            console.error(`[WEBHOOK] No webhook secret configured for hotel ${hotelUuid}`);
            return res.status(400).json({ error: 'Webhook secret not configured' });
        }

        // Verify signature using HMAC SHA-256
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            console.error('[WEBHOOK] Invalid signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Parse the payload
        const payload = JSON.parse(rawBody);
        const event = payload.event;

        console.log(`[WEBHOOK] Received event: ${event} for hotel ${hotelUuid}`);

        // Handle different events
        switch (event) {
            case 'payment.captured': {
                const payment = payload.payload.payment.entity;
                const receipt = payment.notes?.receipt || payment.receipt || '';
                // Extract booking_id from receipt (format: rcpt_<booking_id>)
                const bookingIdMatch = receipt.match(/rcpt_(\d+)/);
                
                if (bookingIdMatch) {
                    const bookingId = parseInt(bookingIdMatch[1]);
                    await pool.query(
                        'UPDATE bookings SET payment_status = ?, razorpay_payment_id = ? WHERE id = ? AND hotel_id = ?',
                        ['paid', payment.id, bookingId, hotel.id]
                    );
                    console.log(`[WEBHOOK] Payment captured for booking #${bookingId}: ${payment.id}`);
                } else {
                    // Try matching by razorpay_payment_id or order_id
                    console.log(`[WEBHOOK] Could not extract booking ID from receipt: ${receipt}. Payment ID: ${payment.id}`);
                }
                break;
            }

            case 'refund.processed':
            case 'refund.created': {
                const refund = payload.payload.refund.entity;
                const paymentId = refund.payment_id;
                const refundAmount = refund.amount / 100; // Convert from paise to rupees

                // Find booking by razorpay_payment_id
                const [bookings] = await pool.query(
                    'SELECT id, guest_email, guest_phone FROM bookings WHERE razorpay_payment_id = ? AND hotel_id = ?',
                    [paymentId, hotel.id]
                );

                if (bookings.length > 0) {
                    const booking = bookings[0];
                    await pool.query(
                        'UPDATE bookings SET refund_status = ?, refund_amount = ?, razorpay_refund_id = ? WHERE id = ?',
                        ['completed', refundAmount, refund.id, booking.id]
                    );
                    console.log(`[WEBHOOK] Refund processed for booking #${booking.id}: ₹${refundAmount}`);

                    // Send refund confirmation email
                    try {
                        await notificationService.sendRefundConfirmation(booking.id, booking.guest_email, refundAmount, hotelUuid);
                    } catch (emailErr) {
                        console.error('[WEBHOOK] Failed to send refund email:', emailErr.message);
                    }
                } else {
                    console.log(`[WEBHOOK] No booking found for payment_id: ${paymentId}`);
                }
                break;
            }

            case 'refund.failed': {
                const refund = payload.payload.refund.entity;
                const paymentId = refund.payment_id;

                const [bookings] = await pool.query(
                    'SELECT id FROM bookings WHERE razorpay_payment_id = ? AND hotel_id = ?',
                    [paymentId, hotel.id]
                );

                if (bookings.length > 0) {
                    await pool.query(
                        'UPDATE bookings SET refund_status = ? WHERE id = ?',
                        ['failed', bookings[0].id]
                    );
                    console.log(`[WEBHOOK] Refund FAILED for booking #${bookings[0].id}`);
                }
                break;
            }

            default:
                console.log(`[WEBHOOK] Unhandled event: ${event}`);
        }

        // Always respond 200 to Razorpay (otherwise it retries)
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('[WEBHOOK] Error processing webhook:', err.message);
        // Still return 200 to prevent Razorpay from retrying on our errors
        res.status(200).json({ status: 'ok' });
    }
});

module.exports = router;
