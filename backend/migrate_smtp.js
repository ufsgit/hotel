const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Adding SMTP columns to hotels table...');
        
        await pool.query(`
            ALTER TABLE hotels
            ADD COLUMN smtp_host VARCHAR(255) DEFAULT NULL,
            ADD COLUMN smtp_port INT DEFAULT NULL,
            ADD COLUMN smtp_user VARCHAR(255) DEFAULT NULL,
            ADD COLUMN smtp_pass VARCHAR(255) DEFAULT NULL;
        `);
        
        console.log('Successfully added SMTP columns.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist, skipping.');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        process.exit();
    }
}

migrate();
