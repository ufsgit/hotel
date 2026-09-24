const pool = require('./src/config/db');

async function check() {
    try {
        const [bookings] = await pool.query("SELECT id, guest_name, total_amount, payment_status, booking_status, created_at, hotel_id FROM bookings;");
        console.log("Bookings:", bookings);

        const [expenses] = await pool.query("SELECT * FROM booking_expenses;");
        console.log("Expenses:", expenses);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
