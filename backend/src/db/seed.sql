USE hotel_booking;

-- Insert Hotel
INSERT INTO hotels (name, slug, address, contact_email, contact_phone, branding_logo_url, branding_primary_color, timezone)
VALUES ('Grand Oasis Hotel', 'grand-oasis', '123 Palm Ave, Beach City', 'contact@grandoasis.com', '+1234567890', 'https://via.placeholder.com/150', '#0ea5e9', 'UTC');

SET @hotel_id = LAST_INSERT_ID();

-- Insert Admin User (password is 'password123' hashed with bcrypt)
INSERT INTO users (hotel_id, name, email, password_hash, role)
VALUES (@hotel_id, 'Admin User', 'admin@grandoasis.com', '$2b$10$FHJBqkA8ngO4yAM1t5mHS.tdGMigMJ5LOGWmDgtRm7.2nljGhIOy6', 'owner');

-- Insert Room Types
INSERT INTO room_types (hotel_id, name, description, max_occupancy, extra_bed_allowed, extra_bed_price, base_price, photos, amenities, total_rooms)
VALUES 
(@hotel_id, 'Standard Room', 'A cozy room with a city view.', 2, FALSE, 0.00, 100.00, '["https://via.placeholder.com/400x300"]', '["WiFi", "TV", "Air Conditioning"]', 10),
(@hotel_id, 'Deluxe Suite', 'Spacious suite with a balcony and ocean view.', 4, TRUE, 30.00, 250.00, '["https://via.placeholder.com/400x300"]', '["WiFi", "TV", "Air Conditioning", "Mini Bar", "Balcony"]', 5);

-- Get Room Type IDs
SET @standard_room_id = (SELECT id FROM room_types WHERE name = 'Standard Room' LIMIT 1);
SET @deluxe_suite_id = (SELECT id FROM room_types WHERE name = 'Deluxe Suite' LIMIT 1);

-- Insert Room Inventory (for the next 5 days)
INSERT INTO room_inventory (room_type_id, date, rooms_available)
VALUES 
(@standard_room_id, CURDATE(), 10),
(@standard_room_id, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 10),
(@standard_room_id, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 10),
(@standard_room_id, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 10),
(@standard_room_id, DATE_ADD(CURDATE(), INTERVAL 4 DAY), 10),
(@deluxe_suite_id, CURDATE(), 5),
(@deluxe_suite_id, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 5),
(@deluxe_suite_id, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 5),
(@deluxe_suite_id, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 5),
(@deluxe_suite_id, DATE_ADD(CURDATE(), INTERVAL 4 DAY), 5);

-- Insert Seasons Offers
INSERT INTO seasons_offers (hotel_id, name, description, banner_image_url, discount_type, discount_value, start_date, end_date, is_active, priority, applicable_room_type_ids)
VALUES 
(@hotel_id, 'Summer Special', 'Get 20% off your stay this summer!', 'https://via.placeholder.com/800x200', 'percent', 20.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), TRUE, 10, CONCAT('[', @standard_room_id, ',', @deluxe_suite_id, ']')),
(@hotel_id, 'Weekend Getaway', 'Flat $50 off on weekend bookings.', 'https://via.placeholder.com/800x200', 'flat', 50.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), FALSE, 5, CONCAT('[', @deluxe_suite_id, ']'));

-- Insert Promo Codes
INSERT INTO promo_codes (hotel_id, code, discount_type, discount_value, valid_from, valid_to, max_uses)
VALUES 
(@hotel_id, 'WELCOME10', 'percent', 10.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 365 DAY), 100);
