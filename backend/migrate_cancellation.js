const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log("Altering hotels table...");
        await pool.query("ALTER TABLE hotels ADD COLUMN cancellation_allowed TINYINT(1) DEFAULT 1, ADD COLUMN cancellation_fee_type ENUM('percentage', 'flat') DEFAULT 'percentage', ADD COLUMN cancellation_fee DECIMAL(10,2) DEFAULT 0.00, ADD COLUMN auto_refund TINYINT(1) DEFAULT 0;");
        console.log("Altering bookings table...");
        await pool.query("ALTER TABLE bookings ADD COLUMN razorpay_payment_id VARCHAR(255) NULL;");
        console.log("Migration successful.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}

migrate();
