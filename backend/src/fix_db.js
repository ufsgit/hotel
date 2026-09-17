const pool = require('./config/db');
const crypto = require('crypto');

async function fixDb() {
    try {
        console.log('Adding uuid column to hotels table...');
        
        // Try adding the column (ignore if it already exists, although in MySQL ADD COLUMN doesn't have IF NOT EXISTS easily)
        try {
            await pool.query('ALTER TABLE hotels ADD COLUMN uuid VARCHAR(36)');
            console.log('Added uuid column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('uuid column already exists.');
            } else {
                console.error('Error adding column:', e.message);
                throw e;
            }
        }
        
        // Backfill existing rows with uuid
        const [hotels] = await pool.query('SELECT id, uuid FROM hotels');
        let backfilled = 0;
        for (const hotel of hotels) {
            if (!hotel.uuid) {
                const uuid = crypto.randomUUID();
                await pool.query('UPDATE hotels SET uuid = ? WHERE id = ?', [uuid, hotel.id]);
                backfilled++;
            }
        }
        console.log(`Backfilled ${backfilled} hotels with UUIDs.`);
        
        // Now try adding UNIQUE constraint
        try {
            await pool.query('ALTER TABLE hotels ADD UNIQUE INDEX idx_uuid (uuid)');
            console.log('Added UNIQUE constraint to uuid.');
        } catch(e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log('UNIQUE constraint already exists.');
            } else {
                console.error('Error adding unique constraint:', e.message);
            }
        }
        
        console.log('Done.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

fixDb();
