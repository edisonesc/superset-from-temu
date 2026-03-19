-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: superset_demo
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` text,
  `country` text,
  `signup_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'Alice','PH','2024-01-10'),(2,'Bob','US','2024-01-12'),(3,'Charlie','PH','2024-01-15'),(4,'David','UK','2024-01-20'),(5,'Eve','CA','2024-01-25'),(6,'Frank','PH','2024-02-01'),(7,'Grace','US','2024-02-03'),(8,'Hannah','PH','2024-02-05'),(9,'Ian','UK','2024-02-08'),(10,'Jane','CA','2024-02-10'),(11,'Karl','PH','2024-02-12'),(12,'Liam','US','2024-02-15'),(13,'Mia','PH','2024-02-18'),(14,'Nina','UK','2024-02-20'),(15,'Owen','CA','2024-02-22'),(16,'Paul','PH','2024-02-25'),(17,'Quinn','US','2024-02-27'),(18,'Rose','PH','2024-03-01'),(19,'Sam','UK','2024-03-03'),(20,'Tina','CA','2024-03-05');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `order_date` date DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,1,'2024-03-01',120.00,'completed'),(2,2,'2024-03-01',80.00,'completed'),(3,3,'2024-03-02',150.00,'pending'),(4,4,'2024-03-02',200.00,'completed'),(5,5,'2024-03-03',50.00,'cancelled'),(6,6,'2024-03-03',300.00,'completed'),(7,7,'2024-03-04',90.00,'completed'),(8,8,'2024-03-04',60.00,'pending'),(9,9,'2024-03-05',220.00,'completed'),(10,10,'2024-03-05',130.00,'completed'),(11,1,'2024-03-06',75.00,'completed'),(12,2,'2024-03-06',40.00,'cancelled'),(13,3,'2024-03-07',180.00,'completed'),(14,4,'2024-03-07',210.00,'pending'),(15,5,'2024-03-08',95.00,'completed'),(16,6,'2024-03-08',110.00,'completed'),(17,7,'2024-03-09',60.00,'completed'),(18,8,'2024-03-09',45.00,'pending'),(19,9,'2024-03-10',170.00,'completed'),(20,10,'2024-03-10',85.00,'completed'),(21,11,'2024-03-11',200.00,'completed'),(22,12,'2024-03-11',150.00,'pending'),(23,13,'2024-03-12',90.00,'completed'),(24,14,'2024-03-12',300.00,'completed'),(25,15,'2024-03-13',250.00,'cancelled'),(26,16,'2024-03-13',120.00,'completed'),(27,17,'2024-03-14',140.00,'completed'),(28,18,'2024-03-14',70.00,'pending'),(29,19,'2024-03-15',310.00,'completed'),(30,20,'2024-03-15',180.00,'completed'),(31,1,'2024-03-16',95.00,'completed'),(32,2,'2024-03-16',60.00,'completed'),(33,3,'2024-03-17',210.00,'pending'),(34,4,'2024-03-17',175.00,'completed'),(35,5,'2024-03-18',80.00,'completed'),(36,6,'2024-03-18',220.00,'completed'),(37,7,'2024-03-19',130.00,'completed'),(38,8,'2024-03-19',55.00,'pending'),(39,9,'2024-03-20',260.00,'completed'),(40,10,'2024-03-20',100.00,'completed'),(41,11,'2024-03-21',190.00,'completed'),(42,12,'2024-03-21',85.00,'cancelled'),(43,13,'2024-03-22',140.00,'completed'),(44,14,'2024-03-22',275.00,'completed'),(45,15,'2024-03-23',160.00,'pending'),(46,16,'2024-03-23',90.00,'completed'),(47,17,'2024-03-24',120.00,'completed'),(48,18,'2024-03-24',75.00,'completed'),(49,19,'2024-03-25',300.00,'completed'),(50,20,'2024-03-25',200.00,'completed');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-20  2:47:21
