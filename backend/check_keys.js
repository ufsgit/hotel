const pool = require('./src/config/db');

async function check() {
    try {
        const [hotels] = await pool.query("SELECT id, name, razorpay_key_id, razorpay_key_secret FROM hotels;");
        console.log("Hotels:", hotels);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
