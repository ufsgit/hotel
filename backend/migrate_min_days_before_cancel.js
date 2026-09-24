const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log("Altering hotels table to add min_days_before_cancel...");
        await pool.query("ALTER TABLE hotels ADD COLUMN min_days_before_cancel INT DEFAULT 0;");
        console.log("Migration successful.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}

migrate();
