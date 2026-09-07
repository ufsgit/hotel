const pool = require('../config/db');
const nodemailer = require('nodemailer');

// MVP: Twilio and Nodemailer configuration. 
// Use fallback mechanism if credentials are not present or if require fails.
let twilioClient = null;
try {
    const twilio = require('twilio');
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
} catch (err) {
    console.warn("Twilio SDK not loaded or missing credentials. Falling back to mock SMS/WhatsApp.");
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'dummy_user',
        pass: process.env.SMTP_PASS || 'dummy_pass'
    }
});

async function logNotification(bookingId, channel, type, status) {
    try {
        await pool.query(
            'INSERT INTO notifications_log (booking_id, channel, type, status) VALUES (?, ?, ?, ?)',
            [bookingId, channel, type, status]
        );
    } catch (err) {
        console.error('Failed to log notification:', err.message);
    }
}

async function sendEmail(bookingId, email, subject, text) {
    try {
        await transporter.sendMail({
            from: '"Hotel Direct Booking" <no-reply@hotelbooking.local>',
            to: email,
            subject: subject,
            text: text
        });
        await logNotification(bookingId, 'email', 'confirmation', 'sent');
    } catch (err) {
        console.error('Email failed:', err.message);
        await logNotification(bookingId, 'email', 'confirmation', 'failed');
    }
}

async function sendSMS(bookingId, phone, message) {
    if (!phone) return;
    try {
        if (twilioClient) {
            await twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
                to: phone
            });
        } else {
            console.log(`[MOCK SMS] To ${phone}: ${message}`);
        }
        await logNotification(bookingId, 'sms', 'confirmation', 'sent');
    } catch (err) {
        console.error('SMS failed:', err.message);
        await logNotification(bookingId, 'sms', 'confirmation', 'failed');
    }
}

async function sendWhatsApp(bookingId, phone, message) {
    if (!phone) return;
    try {
        if (twilioClient) {
            await twilioClient.messages.create({
                body: message,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
                to: `whatsapp:${phone}`
            });
        } else {
            console.log(`[MOCK WhatsApp] To ${phone}: ${message}`);
        }
        await logNotification(bookingId, 'whatsapp', 'confirmation', 'sent');
    } catch (err) {
        console.error('WhatsApp failed:', err.message);
        await logNotification(bookingId, 'whatsapp', 'confirmation', 'failed');
    }
}

async function sendBookingConfirmation(bookingId, email, phone) {
    const textMessage = `Your booking (ID: ${bookingId}) has been successfully confirmed. We look forward to your stay!`;
    const subject = `Booking Confirmation #${bookingId}`;

    // Dispatch all three concurrently
    const promises = [sendEmail(bookingId, email, subject, textMessage)];
    
    if (phone) {
        promises.push(sendSMS(bookingId, phone, textMessage));
        promises.push(sendWhatsApp(bookingId, phone, textMessage));
    }

    await Promise.allSettled(promises);
}

async function sendCancellationAlert(bookingId, email) {
    const subject = `Booking Cancellation #${bookingId}`;
    const textMessage = `Your booking (ID: ${bookingId}) has been cancelled.`;
    await sendEmail(bookingId, email, subject, textMessage);
}

module.exports = {
    sendBookingConfirmation,
    sendCancellationAlert
};
