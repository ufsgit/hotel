require('dotenv').config();
const pool = require('./src/config/db');

async function runMigration() {
    try {
        console.log('Adding offer_image_url to seasons_offers table...');
        await pool.query(`ALTER TABLE seasons_offers ADD COLUMN offer_image_url VARCHAR(255) DEFAULT NULL`);
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column offer_image_url already exists.');
            process.exit(0);
        } else {
            console.error('Migration failed:', err);
            process.exit(1);
        }
    }
}

runMigration();
