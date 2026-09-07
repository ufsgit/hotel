CREATE DATABASE IF NOT EXISTS hotel_booking;
USE hotel_booking;

CREATE TABLE IF NOT EXISTS hotels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    branding_logo_url VARCHAR(255),
    branding_primary_color VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_occupancy INT NOT NULL,
    extra_bed_allowed BOOLEAN DEFAULT FALSE,
    extra_bed_price DECIMAL(10, 2) DEFAULT 0.00,
    base_price DECIMAL(10, 2) NOT NULL,
    photos JSON,
    amenities JSON,
    total_rooms INT NOT NULL,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_type_id INT NOT NULL,
    date DATE NOT NULL,
    rooms_available INT NOT NULL,
    price_override DECIMAL(10, 2),
    UNIQUE KEY idx_room_date (room_type_id, date),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seasons_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    banner_image_url VARCHAR(255),
    discount_type ENUM('percent', 'flat') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    priority INT DEFAULT 0,
    applicable_room_type_ids JSON,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    INDEX idx_active_dates (hotel_id, is_active, start_date, end_date)
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    discount_type ENUM('percent', 'flat') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    max_uses INT DEFAULT NULL,
    times_used INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE KEY idx_hotel_code (hotel_id, code),
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    room_type_id INT NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INT NOT NULL,
    extra_beds INT DEFAULT 0,
    promo_code_id INT DEFAULT NULL,
    season_offer_id INT DEFAULT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
    booking_status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (season_offer_id) REFERENCES seasons_offers(id) ON DELETE SET NULL,
    INDEX idx_checkin_checkout (check_in_date, check_out_date)
);

CREATE TABLE IF NOT EXISTS notifications_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    channel ENUM('whatsapp', 'sms', 'email') NOT NULL,
    type ENUM('confirmation', 'reminder', 'checkin_reminder', 'cancellation') NOT NULL,
    status ENUM('sent', 'failed') NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
