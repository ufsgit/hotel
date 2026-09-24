require('dotenv').config();
const pool = require('./src/config/db');

async function runMigration() {
    try {
        console.log('Adding is_rush_deal to seasons_offers table...');
        await pool.query(`ALTER TABLE seasons_offers ADD COLUMN is_rush_deal BOOLEAN DEFAULT FALSE`);
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column is_rush_deal already exists.');
            process.exit(0);
        } else {
            console.error('Migration failed:', err);
            process.exit(1);
        }
    }
}

runMigration();
