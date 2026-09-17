const pool = require('./src/config/db');
const query = `
CREATE TABLE IF NOT EXISTS booking_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  hotel_id INT NOT NULL,
  expense_type VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(500),
  payment_status ENUM('unpaid', 'paid') DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
)`;
pool.query(query)
  .then(() => console.log('Table created successfully'))
  .catch(err => console.error(err))
  .finally(() => process.exit(0));
