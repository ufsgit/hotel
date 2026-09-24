const pool = require('./src/config/db');
pool.query("UPDATE bookings SET refund_status = 'processing', refund_amount = 220.00 WHERE id = 14")
  .then(() => console.log('Updated booking 14'))
  .catch(console.error)
  .finally(() => process.exit(0));
