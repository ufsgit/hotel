require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration for room details...');

        const columnsToAdd = [
            { name: 'room_size', def: "ADD COLUMN room_size VARCHAR(100) DEFAULT NULL" },
            { name: 'view_type', def: "ADD COLUMN view_type VARCHAR(100) DEFAULT NULL" },
            { name: 'bed_type', def: "ADD COLUMN bed_type VARCHAR(100) DEFAULT NULL" },
            { name: 'detailed_amenities', def: "ADD COLUMN detailed_amenities JSON DEFAULT NULL" },
            { name: 'rate_plans', def: "ADD COLUMN rate_plans JSON DEFAULT NULL" }
        ];

        for (const col of columnsToAdd) {
            try {
                // Check if column exists
                const [existing] = await pool.query(`SHOW COLUMNS FROM room_types LIKE '${col.name}'`);
                if (existing.length === 0) {
                    await pool.query(`ALTER TABLE room_types ${col.def}`);
                    console.log(`✅ Added ${col.name} to room_types`);
                } else {
                    console.log(`⏭️ ${col.name} already exists in room_types`);
                }
            } catch (err) {
                console.error(`❌ Error adding ${col.name}:`, err.message);
            }
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
