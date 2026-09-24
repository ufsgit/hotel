const pool = require('../config/db');
const nodemailer = require('nodemailer');

// MVP: Nodemailer configuration. 
// Use fallback mechanism if credentials are not present.

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

async function sendEmail(bookingId, email, subject, text, hotelSlug) {
    let customTransporter = transporter;
    let fromAddress = '"Hotel Direct Booking" <no-reply@hotelbooking.local>';

    try {
        if (hotelSlug) {
            const [hotels] = await pool.query('SELECT name, contact_email, smtp_host, smtp_port, smtp_user, smtp_pass FROM hotels WHERE uuid = ?', [hotelSlug]);
            if (hotels.length > 0) {
                const hotel = hotels[0];
                if (hotel.smtp_host && hotel.smtp_user) {
                    customTransporter = nodemailer.createTransport({
                        host: hotel.smtp_host,
                        port: hotel.smtp_port || 587,
                        auth: {
                            user: hotel.smtp_user,
                            pass: hotel.smtp_pass
                        }
                    });
                    fromAddress = `"${hotel.name}" <${hotel.smtp_user}>`;
                } else {
                    // Fallback to platform settings
                    const [platformSettingsRows] = await pool.query('SELECT smtp_host, smtp_port, smtp_user, smtp_pass FROM platform_settings WHERE id = 1');
                    if (platformSettingsRows.length > 0) {
                        const pSettings = platformSettingsRows[0];
                        if (pSettings.smtp_host && pSettings.smtp_user) {
                            customTransporter = nodemailer.createTransport({
                                host: pSettings.smtp_host,
                                port: pSettings.smtp_port || 587,
                                auth: {
                                    user: pSettings.smtp_user,
                                    pass: pSettings.smtp_pass
                                }
                            });
                            fromAddress = `"${hotel.name} (via Platform)" <${pSettings.smtp_user}>`;
                        }
                    }
                }
            }
        } else {
            // No hotel slug provided, try platform settings anyway
            const [platformSettingsRows] = await pool.query('SELECT smtp_host, smtp_port, smtp_user, smtp_pass FROM platform_settings WHERE id = 1');
            if (platformSettingsRows.length > 0) {
                const pSettings = platformSettingsRows[0];
                if (pSettings.smtp_host && pSettings.smtp_user) {
                    customTransporter = nodemailer.createTransport({
                        host: pSettings.smtp_host,
                        port: pSettings.smtp_port || 587,
                        auth: {
                            user: pSettings.smtp_user,
                            pass: pSettings.smtp_pass
                        }
                    });
                    fromAddress = `"Hotel Platform" <${pSettings.smtp_user}>`;
                }
            }
        }

        await customTransporter.sendMail({
            from: fromAddress,
            to: email,
            subject: subject,
            text: text
        });
        console.log(`[EMAIL SENT] To ${email}:\nSubject: ${subject}\n\n${text}`);
        await logNotification(bookingId, 'email', 'confirmation', 'sent');
    } catch (err) {
        console.error('Email failed (using MOCK fallback):', err.message);
        console.log(`[MOCK EMAIL FALLBACK] To ${email}:\nSubject: ${subject}\n\n${text}`);
        await logNotification(bookingId, 'email', 'confirmation', 'failed');
    }
}

async function getTwilioConfig() {
    let accountSid = process.env.TWILIO_ACCOUNT_SID;
    let authToken = process.env.TWILIO_AUTH_TOKEN;
    let fromPhone = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
    let fromWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

    try {
        const [platformSettingsRows] = await pool.query('SELECT twilio_account_sid, twilio_auth_token, twilio_phone_number FROM platform_settings WHERE id = 1');
        if (platformSettingsRows.length > 0) {
            const pSettings = platformSettingsRows[0];
            if (pSettings.twilio_account_sid && pSettings.twilio_auth_token) {
                accountSid = pSettings.twilio_account_sid;
                authToken = pSettings.twilio_auth_token;
                if (pSettings.twilio_phone_number) {
                    fromPhone = pSettings.twilio_phone_number;
                }
            }
        }
    } catch (err) {
        console.warn("Failed to fetch twilio settings from DB:", err.message);
    }

    if (accountSid && authToken) {
        try {
            const twilio = require('twilio');
            const client = twilio(accountSid, authToken);
            return { client, fromPhone, fromWhatsapp };
        } catch (err) {
            console.warn("Twilio SDK not loaded:", err.message);
        }
    }
    return { client: null, fromPhone, fromWhatsapp };
}

async function sendSMS(bookingId, phone, message) {
    if (!phone) return;
    try {
        const twilioConfig = await getTwilioConfig();
        if (twilioConfig.client) {
            await twilioConfig.client.messages.create({
                body: message,
                from: twilioConfig.fromPhone,
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
        const twilioConfig = await getTwilioConfig();
        if (twilioConfig.client) {
            await twilioConfig.client.messages.create({
                body: message,
                from: `whatsapp:${twilioConfig.fromWhatsapp}`,
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

async function sendBookingConfirmation(bookingId, email, phone, hotelSlug) {
    const trackingLink = `http://localhost:4201/my-booking?hotel=${hotelSlug}`;
    const textMessage = `Your booking (ID: ${bookingId}) has been successfully confirmed.\n\nYou can track your booking status, view details, or cancel your reservation here:\n${trackingLink}\n\nWe look forward to your stay!`;
    const subject = `Booking Confirmation #${bookingId}`;

    // Dispatch all three concurrently
    const promises = [sendEmail(bookingId, email, subject, textMessage, hotelSlug)];
    
    if (phone) {
        promises.push(sendSMS(bookingId, phone, textMessage));
        promises.push(sendWhatsApp(bookingId, phone, textMessage));
    }

    await Promise.allSettled(promises);
}

async function sendCancellationAlert(bookingId, email, hotelSlug, refundDetails, hasRefund) {
    const subject = `Booking Cancellation #${bookingId}`;
    let textMessage = `Your booking (ID: ${bookingId}) has been successfully cancelled.\n\nDetails:\n${refundDetails}\n`;
    
    if (hasRefund) {
        const trackingLink = `http://localhost:4201/my-booking?hotel=${hotelSlug}`;
        textMessage += `\nYou can track your refund status by clicking the link below:\n${trackingLink}`;
    }
    
    await sendEmail(bookingId, email, subject, textMessage, hotelSlug);
}

async function sendRefundConfirmation(bookingId, email, refundAmount, hotelSlug) {
    const trackingLink = `http://localhost:4201/my-booking?hotel=${hotelSlug}`;
    const subject = `Refund Processed - Booking #${bookingId}`;
    const textMessage = `Great news! Your refund of ₹${refundAmount} for booking #${bookingId} has been successfully processed.\n\nThe refund will be credited to your original payment method within 5-7 business days.\n\nYou can track your booking and refund details here:\n${trackingLink}\n\nThank you for your patience!`;
    
    await sendEmail(bookingId, email, subject, textMessage, hotelSlug);
}

module.exports = {
    sendBookingConfirmation,
    sendCancellationAlert,
    sendRefundConfirmation
};

