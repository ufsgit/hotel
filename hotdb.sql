-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: hotel_booking
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '35f1f18e-371f-11f1-80d5-5cb47e3771c9:1-32865';

--
-- Table structure for table `booking_expenses`
--

DROP TABLE IF EXISTS `booking_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `hotel_id` int NOT NULL,
  `expense_type` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) DEFAULT '0.00',
  `description` varchar(500) DEFAULT NULL,
  `payment_status` enum('unpaid','paid','partial') DEFAULT 'unpaid',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `booking_expenses_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_expenses_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_expenses`
--

LOCK TABLES `booking_expenses` WRITE;
/*!40000 ALTER TABLE `booking_expenses` DISABLE KEYS */;
INSERT INTO `booking_expenses` VALUES (1,5,1,'food',100.00,0.00,'','paid','2026-09-17 09:45:11'),(2,5,1,'gh',4.00,0.00,'','unpaid','2026-09-17 09:46:25'),(3,5,1,'food',2.00,0.00,'','unpaid','2026-09-17 09:52:26'),(4,2,1,'food',100.00,50.00,'','partial','2026-09-17 10:05:18');
/*!40000 ALTER TABLE `booking_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_history`
--

DROP TABLE IF EXISTS `booking_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `changed_by` int DEFAULT NULL,
  `status_type` enum('booking','payment') NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `changed_by` (`changed_by`),
  CONSTRAINT `booking_history_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_history`
--

LOCK TABLES `booking_history` WRITE;
/*!40000 ALTER TABLE `booking_history` DISABLE KEYS */;
INSERT INTO `booking_history` VALUES (1,5,1,'booking','pending','confirmed','2026-09-17 07:13:44'),(2,5,1,'booking','confirmed','checked_in','2026-09-17 07:13:46'),(3,5,1,'payment','paid','unpaid','2026-09-17 07:14:02'),(4,5,1,'payment','unpaid','partial','2026-09-17 07:14:04'),(5,2,1,'booking','checked_in','checked_out','2026-09-17 09:47:03'),(6,2,1,'booking','checked_out','checked_in','2026-09-17 09:47:09'),(7,5,1,'payment','partial','unpaid','2026-09-17 09:52:52'),(8,3,1,'booking','confirmed','checked_in','2026-09-17 10:16:47');
/*!40000 ALTER TABLE `booking_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hotel_id` int NOT NULL,
  `room_type_id` int NOT NULL,
  `guest_name` varchar(255) NOT NULL,
  `guest_email` varchar(255) NOT NULL,
  `guest_phone` varchar(50) DEFAULT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `num_guests` int NOT NULL,
  `extra_beds` int DEFAULT '0',
  `promo_code_id` int DEFAULT NULL,
  `season_offer_id` int DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_status` enum('unpaid','partial','paid') DEFAULT 'unpaid',
  `booking_status` enum('pending','confirmed','checked_in','checked_out','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `amount_paid` decimal(10,2) DEFAULT '0.00',
  `guest_document_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hotel_id` (`hotel_id`),
  KEY `room_type_id` (`room_type_id`),
  KEY `promo_code_id` (`promo_code_id`),
  KEY `season_offer_id` (`season_offer_id`),
  KEY `idx_checkin_checkout` (`check_in_date`,`check_out_date`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`season_offer_id`) REFERENCES `seasons_offers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,1,2,'salman s','salmansajeer321@gmail.com','9048501094','2026-09-09','2026-09-10',2,0,NULL,1,200.00,20.00,220.00,'unpaid','checked_out','2026-09-09 06:54:02',0.00,NULL),(2,1,3,'hakkim','hakkim@gmail.com','9048501088','2026-09-11','2026-09-12',2,0,NULL,1,400.00,40.00,440.00,'unpaid','checked_in','2026-09-09 12:21:01',0.00,NULL),(3,1,1,'salman s','salmansajeer321@gmail.com','','2026-09-11','2026-09-12',2,0,NULL,NULL,100.00,10.00,110.00,'paid','checked_in','2026-09-11 05:41:01',0.00,'http://localhost:3000/uploads/documents/guest_doc_1789120448959.png'),(4,1,1,'TONY','TONY@GMAIL.COM','9048501094','2026-09-11','2026-09-12',3,1,NULL,1,120.00,12.00,132.00,'unpaid','pending','2026-09-11 11:50:04',0.00,NULL),(5,1,1,'TONU','S.2@GOM.OM','9048501088','2026-09-11','2026-09-12',2,0,NULL,1,80.00,8.00,88.00,'unpaid','checked_in','2026-09-11 11:52:45',0.00,NULL);
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hotels`
--

DROP TABLE IF EXISTS `hotels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hotels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `address` text,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `branding_logo_url` varchar(255) DEFAULT NULL,
  `branding_primary_color` varchar(20) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'UTC',
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '10.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `razorpay_key_id` varchar(255) DEFAULT NULL,
  `razorpay_key_secret` varchar(255) DEFAULT NULL,
  `is_suspended` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `idx_uuid` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hotels`
--

LOCK TABLES `hotels` WRITE;
/*!40000 ALTER TABLE `hotels` DISABLE KEYS */;
INSERT INTO `hotels` VALUES (1,'e36e6944-805d-4cbf-add2-a9f6a1816d9e','Grand Oasis Hotel','grand-oasis','123 Palm Ave, Beach City','contact@grandoasis.com','+1234567890','http://localhost:3000/uploads/logos/hotel_logo_1788954953747.png','#0ea5e9','UTC',10.00,'2026-09-02 04:29:49',NULL,NULL,0),(5,'b33fac0a-213b-4cf5-9bae-6db49854bee1','BEACH VIEW','4a202b80-25f4-489b-922f-5472c32ea66d','ALAPPUZHA','beachview@gmail.com','8921946699',NULL,'#f2da64','UTC',10.00,'2026-09-14 05:33:09',NULL,NULL,0),(6,'8f744710-9fca-4c6a-8dd9-5ad649a6d9de','GRAND OASIS','6b9b0618-4248-49b7-b7ba-0f374f8559d8','KOCHI','KOCHI@GMAIL.COM','8987898788',NULL,'#6366f1','UTC',10.00,'2026-09-14 06:55:21',NULL,NULL,0);
/*!40000 ALTER TABLE `hotels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications_log`
--

DROP TABLE IF EXISTS `notifications_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `channel` enum('whatsapp','sms','email') NOT NULL,
  `type` enum('confirmation','reminder','checkin_reminder','cancellation') NOT NULL,
  `status` enum('sent','failed') NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `notifications_log_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications_log`
--

LOCK TABLES `notifications_log` WRITE;
/*!40000 ALTER TABLE `notifications_log` DISABLE KEYS */;
INSERT INTO `notifications_log` VALUES (1,1,'sms','confirmation','sent','2026-09-09 06:54:02'),(2,1,'whatsapp','confirmation','sent','2026-09-09 06:54:02'),(3,1,'email','confirmation','failed','2026-09-09 06:54:05'),(4,2,'sms','confirmation','sent','2026-09-09 12:21:01'),(5,2,'whatsapp','confirmation','sent','2026-09-09 12:21:01'),(6,2,'email','confirmation','failed','2026-09-09 12:21:04'),(7,2,'email','confirmation','failed','2026-09-09 12:23:58'),(8,3,'email','confirmation','failed','2026-09-11 05:41:05'),(9,4,'sms','confirmation','sent','2026-09-11 11:50:04'),(10,4,'whatsapp','confirmation','sent','2026-09-11 11:50:04'),(11,4,'email','confirmation','failed','2026-09-11 11:50:08'),(12,5,'sms','confirmation','sent','2026-09-11 11:52:45'),(13,5,'whatsapp','confirmation','sent','2026-09-11 11:52:45'),(14,5,'email','confirmation','failed','2026-09-11 11:52:48');
/*!40000 ALTER TABLE `notifications_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_settings`
--

DROP TABLE IF EXISTS `platform_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_settings` (
  `id` int NOT NULL DEFAULT '1',
  `default_tax_rate` decimal(5,2) DEFAULT '10.00',
  `default_primary_color` varchar(20) DEFAULT '#6366f1',
  `terms_of_service_url` varchar(512) DEFAULT NULL,
  `smtp_host` varchar(255) DEFAULT NULL,
  `smtp_port` int DEFAULT '587',
  `smtp_user` varchar(255) DEFAULT NULL,
  `smtp_pass` varchar(255) DEFAULT NULL,
  `twilio_account_sid` varchar(255) DEFAULT NULL,
  `twilio_auth_token` varchar(255) DEFAULT NULL,
  `twilio_phone_number` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_settings`
--

LOCK TABLES `platform_settings` WRITE;
/*!40000 ALTER TABLE `platform_settings` DISABLE KEYS */;
INSERT INTO `platform_settings` VALUES (1,10.00,'#6366f1',NULL,NULL,587,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `platform_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promo_codes`
--

DROP TABLE IF EXISTS `promo_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promo_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hotel_id` int NOT NULL,
  `code` varchar(50) NOT NULL,
  `discount_type` enum('percent','flat') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `valid_from` date NOT NULL,
  `valid_to` date NOT NULL,
  `max_uses` int DEFAULT NULL,
  `times_used` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_hotel_code` (`hotel_id`,`code`),
  CONSTRAINT `promo_codes_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promo_codes`
--

LOCK TABLES `promo_codes` WRITE;
/*!40000 ALTER TABLE `promo_codes` DISABLE KEYS */;
INSERT INTO `promo_codes` VALUES (1,1,'WELCOME10','percent',10.00,'2026-09-02','2027-09-02',100,0,1),(2,1,'gg','flat',10.00,'2026-09-11','2026-09-19',NULL,0,1);
/*!40000 ALTER TABLE `promo_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room_inventory`
--

DROP TABLE IF EXISTS `room_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_type_id` int NOT NULL,
  `date` date NOT NULL,
  `rooms_available` int NOT NULL,
  `price_override` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_room_date` (`room_type_id`,`date`),
  CONSTRAINT `room_inventory_ibfk_1` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room_inventory`
--

LOCK TABLES `room_inventory` WRITE;
/*!40000 ALTER TABLE `room_inventory` DISABLE KEYS */;
INSERT INTO `room_inventory` VALUES (1,1,'2026-09-02',10,NULL),(2,1,'2026-09-03',10,NULL),(3,1,'2026-09-04',10,NULL),(4,1,'2026-09-05',10,NULL),(5,1,'2026-09-06',10,NULL),(6,2,'2026-09-02',5,NULL),(7,2,'2026-09-03',5,NULL),(8,2,'2026-09-04',5,NULL),(9,2,'2026-09-05',5,NULL),(10,2,'2026-09-06',5,NULL);
/*!40000 ALTER TABLE `room_inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room_types`
--

DROP TABLE IF EXISTS `room_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hotel_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `default_capacity` int NOT NULL DEFAULT '2',
  `max_occupancy` int NOT NULL,
  `extra_bed_allowed` tinyint(1) DEFAULT '0',
  `extra_bed_price` decimal(10,2) DEFAULT '0.00',
  `base_price` decimal(10,2) NOT NULL,
  `photos` json DEFAULT NULL,
  `amenities` json DEFAULT NULL,
  `total_rooms` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `room_types_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room_types`
--

LOCK TABLES `room_types` WRITE;
/*!40000 ALTER TABLE `room_types` DISABLE KEYS */;
INSERT INTO `room_types` VALUES (1,1,'Standard Room','A cozy room with a city view.',2,3,1,50.00,100.00,'[\"http://localhost:3000/uploads/rooms/room_1788951974935.jpg\"]','[\"WiFi\", \"TV\", \"Air Conditioning\"]',3),(2,1,'Deluxe Suite','Spacious suite with a balcony and ocean view.',3,4,1,30.00,250.00,'[\"http://localhost:3000/uploads/rooms/room_1788951999262.jpg\"]','[\"WiFi\", \"TV\", \"Air Conditioning\", \"Mini Bar\", \"Balcony\"]',5),(3,1,'new room','',2,2,0,0.00,500.00,'[\"http://localhost:3000/uploads/rooms/room_1788952032216.jpg\"]','[\"WiFi\", \"TV\", \"Balcony\", \"Jacuzzi\"]',10);
/*!40000 ALTER TABLE `room_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seasons_offers`
--

DROP TABLE IF EXISTS `seasons_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seasons_offers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hotel_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `banner_image_url` varchar(255) DEFAULT NULL,
  `discount_type` enum('percent','flat') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT '0',
  `priority` int DEFAULT '0',
  `applicable_room_type_ids` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_active_dates` (`hotel_id`,`is_active`,`start_date`,`end_date`),
  CONSTRAINT `seasons_offers_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seasons_offers`
--

LOCK TABLES `seasons_offers` WRITE;
/*!40000 ALTER TABLE `seasons_offers` DISABLE KEYS */;
INSERT INTO `seasons_offers` VALUES (1,1,'Summer Special','Get 20% off your stay this summer!','http://localhost:3000/uploads/offers/offer_1788954251538.jpg','percent',20.00,'2026-08-29','2026-09-28',1,10,'[1, 2]'),(2,1,'Weekend Getaway','Flat 50 off on weekend bookings.','http://localhost:3000/uploads/offers/offer_1788954368010.jpg','flat',50.00,'2026-08-31','2026-09-07',0,5,'[2]'),(3,5,'HOLI OFFERS!!','GET 100OFF ON YOUR FIRST BOOKING','','flat',100.00,'2026-09-14','2026-09-28',1,5,NULL);
/*!40000 ALTER TABLE `seasons_offers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_hotels`
--

DROP TABLE IF EXISTS `user_hotels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_hotels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `hotel_id` int NOT NULL,
  `role` enum('owner','staff') NOT NULL DEFAULT 'staff',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `permissions` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_hotel` (`user_id`,`hotel_id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `user_hotels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_hotels_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_hotels`
--

LOCK TABLES `user_hotels` WRITE;
/*!40000 ALTER TABLE `user_hotels` DISABLE KEYS */;
INSERT INTO `user_hotels` VALUES (1,1,1,'owner','2026-09-14 06:21:32',NULL),(2,4,5,'owner','2026-09-14 06:21:32',NULL),(5,1,6,'owner','2026-09-14 08:47:46',NULL),(6,7,1,'staff','2026-09-14 08:56:14','[\"rooms\", \"calendar\", \"reservations\"]');
/*!40000 ALTER TABLE `user_hotels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('owner','staff','super_admin','user') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','admin@grandoasis.com','$2b$10$AX7jnA2aE64lIgqyWJGPDOzL3UDE2VrF0oST5BTuveo1mP6n2GPn6','user','2026-09-02 04:29:49'),(2,'Super Admin','superadmin@platform.com','$2b$10$FHJBqkA8ngO4yAM1t5mHS.tdGMigMJ5LOGWmDgtRm7.2nljGhIOy6','super_admin','2026-09-14 05:18:45'),(4,'jay','beachview@gmail.com','$2b$10$KNOoVuVv.rHBxDMWQ28skOmHUDvJNCJe9bkUIzASbra8Y32Et.BVy','user','2026-09-14 05:33:56'),(7,'RIJU','riju@gmail.com','$2b$10$4YOwWCrx5bD4B20xcn8jrOuBtxapu7P7dy.usS7GsqJzyaEBo.ssC','user','2026-09-14 08:49:37');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-17 16:30:04
