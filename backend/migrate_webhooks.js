const pool = require('./src/config/db');

async function migrate() {
    try {
        // Check and add razorpay_webhook_secret to hotels
        const [hotelCols] = await pool.query(`SHOW COLUMNS FROM hotels LIKE 'razorpay_webhook_secret'`);
        if (hotelCols.length === 0) {
            await pool.query(`ALTER TABLE hotels ADD COLUMN razorpay_webhook_secret VARCHAR(255) DEFAULT NULL`);
            console.log('✅ Added razorpay_webhook_secret to hotels table');
        } else {
            console.log('⏭️  razorpay_webhook_secret already exists');
        }

        // Check and add refund_status to bookings
        const [refundStatusCols] = await pool.query(`SHOW COLUMNS FROM bookings LIKE 'refund_status'`);
        if (refundStatusCols.length === 0) {
            await pool.query(`ALTER TABLE bookings ADD COLUMN refund_status ENUM('none','processing','completed','failed') DEFAULT 'none'`);
            console.log('✅ Added refund_status to bookings table');
        } else {
            console.log('⏭️  refund_status already exists');
        }

        // Check and add refund_amount to bookings
        const [refundAmountCols] = await pool.query(`SHOW COLUMNS FROM bookings LIKE 'refund_amount'`);
        if (refundAmountCols.length === 0) {
            await pool.query(`ALTER TABLE bookings ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT 0.00`);
            console.log('✅ Added refund_amount to bookings table');
        } else {
            console.log('⏭️  refund_amount already exists');
        }

        // Check and add razorpay_refund_id to bookings
        const [refundIdCols] = await pool.query(`SHOW COLUMNS FROM bookings LIKE 'razorpay_refund_id'`);
        if (refundIdCols.length === 0) {
            await pool.query(`ALTER TABLE bookings ADD COLUMN razorpay_refund_id VARCHAR(255) DEFAULT NULL`);
            console.log('✅ Added razorpay_refund_id to bookings table');
        } else {
            console.log('⏭️  razorpay_refund_id already exists');
        }

        console.log('\n🎉 Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
