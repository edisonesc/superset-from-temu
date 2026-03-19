-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: superset_meta
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
-- Table structure for table `__drizzle_migrations`
--

DROP TABLE IF EXISTS `__drizzle_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `__drizzle_migrations`
--

LOCK TABLES `__drizzle_migrations` WRITE;
/*!40000 ALTER TABLE `__drizzle_migrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `__drizzle_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `charts`
--

DROP TABLE IF EXISTS `charts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `charts` (
  `id` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `viz_type` varchar(64) NOT NULL,
  `dataset_id` varchar(128) NOT NULL,
  `config` json NOT NULL,
  `query_context` json DEFAULT NULL,
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `charts_dataset_id_datasets_id_fk` (`dataset_id`),
  KEY `charts_created_by_users_id_fk` (`created_by`),
  CONSTRAINT `charts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `charts_dataset_id_datasets_id_fk` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `charts`
--

LOCK TABLES `charts` WRITE;
/*!40000 ALTER TABLE `charts` DISABLE KEYS */;
INSERT INTO `charts` VALUES ('aauqt8r79p6ak9xb0yi629kv','Users Chart',NULL,'bar','o47r79gx7bgp1yrx3uvaapo5','{}',NULL,'z9vzcq57t76fb6x0rz8gvdig','2026-03-18 17:19:19','2026-03-18 17:19:46'),('khz7jf0f3oge8rq1ubiayp0r','HorizontalCustomerOrder',NULL,'bar','ok84qbekr4daqunxf3kyizwi','{\"x_axis\": \"order_date\", \"metrics\": [\"amount\"], \"orientation\": \"horizontal\"}',NULL,'z9vzcq57t76fb6x0rz8gvdig','2026-03-19 09:25:06','2026-03-19 09:25:06'),('oum0pgvqke1n8n9kxlasgg9a','Customers Order Sample',NULL,'line','ok84qbekr4daqunxf3kyizwi','{\"x_axis\": \"order_date\", \"metrics\": [\"amount\"], \"stacked\": true, \"showLegend\": true}',NULL,'z9vzcq57t76fb6x0rz8gvdig','2026-03-19 06:57:40','2026-03-19 08:14:07');
/*!40000 ALTER TABLE `charts` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dashboard_charts`
--

DROP TABLE IF EXISTS `dashboard_charts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_charts` (
  `id` varchar(128) NOT NULL,
  `dashboard_id` varchar(128) NOT NULL,
  `chart_id` varchar(128) NOT NULL,
  `position` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dashboard_charts_dashboard_id_dashboards_id_fk` (`dashboard_id`),
  KEY `dashboard_charts_chart_id_charts_id_fk` (`chart_id`),
  CONSTRAINT `dashboard_charts_chart_id_charts_id_fk` FOREIGN KEY (`chart_id`) REFERENCES `charts` (`id`),
  CONSTRAINT `dashboard_charts_dashboard_id_dashboards_id_fk` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dashboard_charts`
--

LOCK TABLES `dashboard_charts` WRITE;
/*!40000 ALTER TABLE `dashboard_charts` DISABLE KEYS */;
INSERT INTO `dashboard_charts` VALUES ('ag2zw89q301kd46kpo5q891b','awo9e4eimqckbf6nsraluroh','aauqt8r79p6ak9xb0yi629kv','{\"colSpan\": 6, \"rowSpan\": 4}'),('apd8k81all5b72fdnx77xt6h','awo9e4eimqckbf6nsraluroh','oum0pgvqke1n8n9kxlasgg9a','{\"colSpan\": 6, \"rowSpan\": 4}'),('tsaod9bmhso3zfaaz3jpu0ix','cdnbhjlw1a2qjkzft6erumut','khz7jf0f3oge8rq1ubiayp0r','{\"colSpan\": 6, \"rowSpan\": 4}'),('xiw2aulm3g6b59o2sr3thqzr','cdnbhjlw1a2qjkzft6erumut','oum0pgvqke1n8n9kxlasgg9a','{\"colSpan\": 6, \"rowSpan\": 4}'),('ylmewlenmnvts8b05e5y04qw','cdnbhjlw1a2qjkzft6erumut','aauqt8r79p6ak9xb0yi629kv','{\"colSpan\": 6, \"rowSpan\": 4}');
/*!40000 ALTER TABLE `dashboard_charts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dashboards`
--

DROP TABLE IF EXISTS `dashboards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboards` (
  `id` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `slug` varchar(255) NOT NULL,
  `layout` json DEFAULT NULL,
  `filter_config` json DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dashboards_slug_unique` (`slug`),
  KEY `dashboards_created_by_users_id_fk` (`created_by`),
  CONSTRAINT `dashboards_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dashboards`
--

LOCK TABLES `dashboards` WRITE;
/*!40000 ALTER TABLE `dashboards` DISABLE KEYS */;
INSERT INTO `dashboards` VALUES ('awo9e4eimqckbf6nsraluroh','Test3',NULL,'test3','[{\"id\": \"apd8k81all5b72fdnx77xt6h\", \"chartId\": \"oum0pgvqke1n8n9kxlasgg9a\", \"colSpan\": 6, \"rowSpan\": 4}, {\"id\": \"ag2zw89q301kd46kpo5q891b\", \"chartId\": \"aauqt8r79p6ak9xb0yi629kv\", \"colSpan\": 6, \"rowSpan\": 4}]','[]',0,'z9vzcq57t76fb6x0rz8gvdig','2026-03-19 12:11:50','2026-03-19 12:12:10'),('cdnbhjlw1a2qjkzft6erumut','TestDashboard','1','testdashboard','[{\"id\": \"tsaod9bmhso3zfaaz3jpu0ix\", \"chartId\": \"khz7jf0f3oge8rq1ubiayp0r\", \"colSpan\": 6, \"rowSpan\": 4}, {\"id\": \"xiw2aulm3g6b59o2sr3thqzr\", \"chartId\": \"oum0pgvqke1n8n9kxlasgg9a\", \"colSpan\": 6, \"rowSpan\": 4}, {\"id\": \"ylmewlenmnvts8b05e5y04qw\", \"chartId\": \"aauqt8r79p6ak9xb0yi629kv\", \"colSpan\": 6, \"rowSpan\": 4}]','[]',1,'z9vzcq57t76fb6x0rz8gvdig','2026-03-18 17:16:54','2026-03-19 09:25:24');
/*!40000 ALTER TABLE `dashboards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `database_connections`
--

DROP TABLE IF EXISTS `database_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `database_connections` (
  `id` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `dialect` enum('mysql','postgresql') NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int NOT NULL,
  `database_name` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `encrypted_password` text NOT NULL,
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `database_connections_created_by_users_id_fk` (`created_by`),
  CONSTRAINT `database_connections_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `database_connections`
--

LOCK TABLES `database_connections` WRITE;
/*!40000 ALTER TABLE `database_connections` DISABLE KEYS */;
INSERT INTO `database_connections` VALUES ('koe6xzfwpg5myn9pnc3z0srl','TEST_CONN','test','mysql','localhost',3306,'superset_demo','root','+utZLJWjI4hAjpdofw+ZDVtddzTRPxrzGrdesooc2uM=','z9vzcq57t76fb6x0rz8gvdig','2026-03-19 13:39:36','2026-03-19 13:39:36'),('m5g9r38r3e6y3pvmnzuyb078','TestDB 2',NULL,'mysql','localhost',3306,'superset_meta','root','hb8p8/2yoBl7wdCpFcJ7FagrmP3T0Z2/ZGvT+LrKdGE=','z9vzcq57t76fb6x0rz8gvdig','2026-03-18 16:49:42','2026-03-18 16:49:42'),('vcxkjy4vmmhsx6diexpwr28c','Local MySQL (test)','Seed connection for testing SQL Lab','mysql','localhost',3306,'superset_meta','root','o+fiVhtvUpdGV9OmXKuOGkNoQ6mhSv7rLZnNSxf5kXc=','z9vzcq57t76fb6x0rz8gvdig','2026-03-18 16:07:09','2026-03-18 16:07:09'),('xg5aojj2387k3umy9t3odjvw','Sample Superset DB (Mocked)',NULL,'mysql','localhost',3306,'superset_demo','root','4xx/0jy3GZhypBqy1LXztO0l9A4KQpVUhZg0WzthFh4=','z9vzcq57t76fb6x0rz8gvdig','2026-03-19 06:20:16','2026-03-19 06:20:16');
/*!40000 ALTER TABLE `database_connections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `datasets`
--

DROP TABLE IF EXISTS `datasets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `datasets` (
  `id` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `connection_id` varchar(128) NOT NULL,
  `table_name` varchar(255) DEFAULT NULL,
  `sql_definition` text,
  `column_metadata` json DEFAULT NULL,
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `datasets_connection_id_database_connections_id_fk` (`connection_id`),
  KEY `datasets_created_by_users_id_fk` (`created_by`),
  CONSTRAINT `datasets_connection_id_database_connections_id_fk` FOREIGN KEY (`connection_id`) REFERENCES `database_connections` (`id`),
  CONSTRAINT `datasets_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `datasets`
--

LOCK TABLES `datasets` WRITE;
/*!40000 ALTER TABLE `datasets` DISABLE KEYS */;
INSERT INTO `datasets` VALUES ('i6d1d5yqoo8y3zdrpuc6qldc','OrdersV2',NULL,'koe6xzfwpg5myn9pnc3z0srl','orders',NULL,NULL,'z9vzcq57t76fb6x0rz8gvdig','2026-03-19 13:51:46','2026-03-19 13:51:46'),('k9ve9h3t4jjyuuef4br5bc4l','Orders',NULL,'xg5aojj2387k3umy9t3odjvw',NULL,'SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id',NULL,'z9vzcq57t76fb6x0rz8gvdig','2026-03-19 13:36:23','2026-03-19 13:36:23'),('o47r79gx7bgp1yrx3uvaapo5','Users',NULL,'m5g9r38r3e6y3pvmnzuyb078','users',NULL,NULL,'z9vzcq57t76fb6x0rz8gvdig','2026-03-18 16:57:56','2026-03-18 16:57:56'),('ok84qbekr4daqunxf3kyizwi','CustomerOrdersSample',NULL,'xg5aojj2387k3umy9t3odjvw',NULL,'SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id','[{\"name\": \"id\", \"type\": \"8\", \"label\": \"id\", \"nullable\": true, \"description\": \"\", \"is_temporal\": false, \"is_groupable\": true, \"is_filterable\": true}, {\"name\": \"order_date\", \"type\": \"10\", \"label\": \"order_date\", \"nullable\": true, \"description\": \"\", \"is_temporal\": true, \"is_groupable\": true, \"is_filterable\": true}, {\"name\": \"amount\", \"type\": \"246\", \"label\": \"amount\", \"nullable\": true, \"description\": \"\", \"is_temporal\": false, \"is_groupable\": true, \"is_filterable\": true}, {\"name\": \"status\", \"type\": \"252\", \"label\": \"status\", \"nullable\": true, \"description\": \"\", \"is_temporal\": false, \"is_groupable\": true, \"is_filterable\": true}, {\"name\": \"country\", \"type\": \"252\", \"label\": \"country\", \"nullable\": true, \"description\": \"\", \"is_temporal\": false, \"is_groupable\": true, \"is_filterable\": true}]','z9vzcq57t76fb6x0rz8gvdig','2026-03-19 06:55:18','2026-03-19 07:19:27'),('q1gnctt2kcnrc404snpfwyu6','Test3',NULL,'xg5aojj2387k3umy9t3odjvw',NULL,'SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id',NULL,'z9vzcq57t76fb6x0rz8gvdig','2026-03-19 13:37:07','2026-03-19 13:37:07');
/*!40000 ALTER TABLE `datasets` ENABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `query_history`
--

DROP TABLE IF EXISTS `query_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `query_history` (
  `id` varchar(128) NOT NULL,
  `sql` text NOT NULL,
  `connection_id` varchar(128) NOT NULL,
  `executed_by` varchar(128) NOT NULL,
  `status` enum('success','error') NOT NULL,
  `row_count` int DEFAULT NULL,
  `duration_ms` bigint DEFAULT NULL,
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `query_history_connection_id_database_connections_id_fk` (`connection_id`),
  KEY `query_history_executed_by_users_id_fk` (`executed_by`),
  CONSTRAINT `query_history_connection_id_database_connections_id_fk` FOREIGN KEY (`connection_id`) REFERENCES `database_connections` (`id`),
  CONSTRAINT `query_history_executed_by_users_id_fk` FOREIGN KEY (`executed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `query_history`
--

LOCK TABLES `query_history` WRITE;
/*!40000 ALTER TABLE `query_history` DISABLE KEYS */;
INSERT INTO `query_history` VALUES ('a8qiolsc0m4n1do9l7p39qsf','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,7,NULL,'2026-03-19 06:04:01'),('adct4ryrfq5h8bwoqwj6xl79','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,10,NULL,'2026-03-19 09:56:55'),('adt85yj896mzty5ltfw8wicy','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `order_date` = \'2024-03-20T16:00:00.000Z\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',0,5,NULL,'2026-03-19 10:17:53'),('af3fzhtuqii5k20y8nfki3jb','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,10,NULL,'2026-03-19 13:35:11'),('b0nwghk1ujxin2pgieh5glcp','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,10,NULL,'2026-03-19 11:58:55'),('b8cemqgq3yy7g9yb5k8qk0ch','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,3,'Unknown column \'id\' in \'where clause\'','2026-03-19 13:35:19'),('b8nu1bfw5tkalrq4yj4o7b2l','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,16,NULL,'2026-03-19 11:51:28'),('ba8wfl854i4kqp6l7yuz86es','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,5,NULL,'2026-03-19 10:17:38'),('bdvdxz0dwp4b9rfjcr26po4m','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,10,NULL,'2026-03-19 10:17:38'),('bfnnlhp8evcslqpcgkcqv2n1','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 09:15:46'),('c2cd0ziam0xun42cxxnkfzqn','SELECT *\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,7,NULL,'2026-03-19 07:07:32'),('cdj9bim671wdyw6ts2xhuzyl','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,6,'Unknown column \'id\' in \'where clause\'','2026-03-19 10:17:46'),('ci6sfd8vottdid0ffw4luakl','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,14,NULL,'2026-03-19 11:06:45'),('d21q11i4dfxdgk7y88k5a1z7','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,7,NULL,'2026-03-19 10:56:41'),('d5y72eao8grq8q6azz50gppo','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-19 08:18:40'),('dj2vnsgteii75x9m8xx4y64z','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,5,NULL,'2026-03-19 06:17:26'),('dldznd2zag2n7jg60ofybhnz','SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,4,NULL,'2026-03-19 06:21:33'),('ds5om1qmk4tz2epxi9ybs95h','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,21,NULL,'2026-03-19 11:51:28'),('e3pvdr0iwbgas1gjcodlh13l','SELECT * FROM (SELECT *\nFROM `users`) AS __filtered__ WHERE `order_date` = \'2024-03-20T16:00:00.000Z\'','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','error',NULL,3,'Unknown column \'order_date\' in \'where clause\'','2026-03-19 10:17:55'),('e4uanuco59q932kda10973lh','SELECT ``\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','error',NULL,4,'Unknown column \'\' in \'field list\'','2026-03-18 16:58:21'),('e51ctx89xecjf86awve6aq05','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,8,NULL,'2026-03-19 07:27:05'),('enqz3zzfdphr4gxdqwyqi0gg','SELECT ``\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,3,'Unknown column \'\' in \'field list\'','2026-03-19 06:55:58'),('ephkxvdt9w2ugz604wdeznsg','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,8,NULL,'2026-03-19 11:06:45'),('etl8p7eenreuqfy7obbhvq0u','SELECT * FROM charts LIMIT 100\nSELECT * FROM dashboard_charts LIMIT 100\nSELECT * FROM dashboards LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','error',NULL,2,'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'SELECT * FROM dashboard_charts LIMIT 100\nSELECT * FROM dashboards LIMIT 100\' at line 2','2026-03-18 16:11:10'),('ev8husqdizeaw0jg7m959ec7','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,13,NULL,'2026-03-19 07:08:19'),('evqj2u0wo8q0mvp0pzkropee','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-19 08:13:12'),('fbhd8rptwgzie0hw8nc1xw8y','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-19 11:14:47'),('fd2uoh175yirf1xrq9hmr81z','SELECT * FROM (SELECT *\nFROM `users`) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-18 17:20:39'),('fweo1drem74dewl6p6q70i5c','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,5,NULL,'2026-03-19 11:14:47'),('g3v92yg76odfrvyso39w809j','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,5,NULL,'2026-03-19 10:03:48'),('g4xk2caik7cwuqk6pc5w760c','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,3,NULL,'2026-03-19 11:06:45'),('g7c3k3t5t3bbuwba17d7kn1e','SELECT *\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 07:19:35'),('gfd3jdvxtdluvduvjvr2xctc','SELECT * FROM (SELECT *\nFROM `users`) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-18 18:33:59'),('gfxdu0r2s5p62axbxhothz40','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,19,NULL,'2026-03-19 11:58:55'),('ggkh7dopcjoveccyg58maj7t','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-19 12:12:08'),('gtibfqp0j8dyj3j1oy7rhlwq','SELECT ``\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,2,'Unknown column \'\' in \'field list\'','2026-03-19 06:56:48'),('h1ujuvobtx5n12o0bmbuzv1p','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,4,'Unknown column \'id\' in \'where clause\'','2026-03-19 10:17:46'),('h9smbyy3tbj29wk86ji7lil3','SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id;','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,2,'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'LIMIT 10000\' at line 8','2026-03-19 06:21:17'),('hc99zubr4tw1ukn34nnjawae','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-18 17:19:17'),('hv4a9y4sxcvnvg2n4tqi90ws','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,7,NULL,'2026-03-19 10:56:41'),('i7b3tqe4j5l7feo5o4ssl6on','SELECT * FROM (SELECT *\nFROM `users`) AS __filtered__ WHERE `order_date` = \'2024-03-20T16:00:00.000Z\'','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','error',NULL,9,'Unknown column \'order_date\' in \'where clause\'','2026-03-19 10:17:53'),('i7qtcvdohupm208sxjw7a002','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-19 09:08:25'),('iddyjmcm2ysh3ajfwa60s4o4','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 11:41:08'),('ig72fbxg5au9clfp85kjmeyx','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,6,'Unknown column \'id\' in \'where clause\'','2026-03-19 13:35:19'),('ike4hjjmdzlfotbgv1id1vt5','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,3,NULL,'2026-03-19 08:03:41'),('iz8jbyj2ka7uvtfk529t0v3g','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,10,NULL,'2026-03-19 09:21:11'),('j4mu1t1guis6gbbdj605cq5o','SELECT *\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,7,NULL,'2026-03-19 07:13:51'),('jgilnbiuobmcm60g830o1gj0','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,7,NULL,'2026-03-19 09:21:11'),('jhgd9qsr2y76gwf1f12tmup7','SELECT `order_date`, `amount`, `order_date`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,4,NULL,'2026-03-19 07:29:09'),('jl9ppnwk7m2qztn7lrxqwnyb','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,7,NULL,'2026-03-18 18:15:36'),('jng4rdmm9x2hktfamh4g02av','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,10,NULL,'2026-03-19 13:18:15'),('jswujt4os4biu32v541slg9b','SELECT\n  *\nFROM\n  users\nLIMIT\n  100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-18 17:51:00'),('jtse0jmdl7pycstbkqhqr7xd','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,8,NULL,'2026-03-19 07:57:18'),('kiec7zmklnjbo9m5lbelxxku','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,8,NULL,'2026-03-19 09:56:55'),('krfm9za51iz4163t8500inwu','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-19 09:15:51'),('krxc6dmh41w8twf7219vfo5k','SELECT\n  *\nFROM\n  users\nLIMIT\n  100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,3,NULL,'2026-03-18 16:12:42'),('l1ld7ujw7pfjvasezxonriry','SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,3,NULL,'2026-03-18 17:58:51'),('l2qayeg2dq6qa9i0alxtngrw','SELECT * FROM (SELECT *\nFROM `users`) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,10,NULL,'2026-03-19 13:35:18'),('lj2pjbvw2qlf88vhheb8r4xm','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,13,'Unknown column \'id\' in \'where clause\'','2026-03-19 10:17:45'),('llfwmqxs9zgc2bf3pn0c86xo','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 10:27:26'),('ls3cmrzpivvchjn1k7ldsmyn','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 10:50:37'),('m0gi26ftxylzwyp5dleqnu3w','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 13:50:05'),('m593sxo35kqou8c9g9yf3ug5','SELECT *\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 09:24:18'),('mil341b5p69qz0zfe2o10x1f','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,8,NULL,'2026-03-19 10:50:37'),('mn4es5y5hs6kr8ar947w357s','SELECT *\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,7,NULL,'2026-03-19 07:02:03'),('mvt38re9frt4okped5qj4n26','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-18 17:33:37'),('n89n1egx1xlhk7g3m6nasb4v','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-19 07:27:05'),('o7etl3f2nxoi2okuwaxhkogs','SELECT * FROM dashboards LIMIT 100\nSELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','error',NULL,2,'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'SELECT * FROM users LIMIT 100\' at line 2','2026-03-18 16:12:04'),('oar9nh1aykdzogtvjxvslf83','SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,3,NULL,'2026-03-18 18:34:41'),('odd55zvdv959zmhjw3p5x9eb','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,11,NULL,'2026-03-19 10:17:38'),('oms6l4cla3yudy9i5wqhrnxl','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,5,NULL,'2026-03-19 06:55:32'),('orqyv20duq7aqb1zwazi5iw3','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `order_date` = \'2024-03-20T16:00:00.000Z\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',0,9,NULL,'2026-03-19 10:17:53'),('ozlm8owt65dnt1fz302ab2ou','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,14,NULL,'2026-03-19 08:13:12'),('ppzy2lj691yd2o6nlueay18g','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,5,NULL,'2026-03-19 10:50:37'),('pxidljug6gjbc0phb8nlmiqn','SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-18 16:37:52'),('q6ilghlg9s063y2hyt4fed21','SELECT *\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,4,NULL,'2026-03-19 06:55:37'),('qb0r6ls4ybwhzyqkep6cntxc','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,12,NULL,'2026-03-19 07:57:18'),('qdr4uqmlpv7dsdtcka638fic','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,9,'Unknown column \'id\' in \'where clause\'','2026-03-19 13:35:18'),('qg3wm2xzwi4zcavhgd7qo0np','SELECT * FROM users LIMIT 100','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,3,NULL,'2026-03-18 16:53:09'),('qh73kwu40tmg71gx58sntc18','SELECT * FROM charts LIMIT 100;\nSELECT * FROM dashboard_charts LIMIT 100;\nSELECT * FROM dashboards LIMIT 100;','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','error',NULL,3,'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'SELECT * FROM dashboard_charts LIMIT 100;\nSELECT * FROM dashboards LIMIT 100\' at line 2','2026-03-18 16:11:34'),('rk2zvxajrsqfszrxu585xj9p','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,7,NULL,'2026-03-19 13:19:11'),('rmqkv5ifl5k9r8jb63n75jyp','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,14,NULL,'2026-03-19 08:18:40'),('rsp7oefa2uphj4j9yglevgr4','SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-18 17:24:42'),('rt1w3nizlsd6auh0vx4lqhzf','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,6,'Unknown column \'id\' in \'where clause\'','2026-03-19 13:35:18'),('s3tiivd20o2ma09k3l5fdwxj','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-19 11:20:02'),('sf08mz33h3staqurw9u5pg3o','SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-19 06:04:15'),('skpy6gdjpb5zhazcadtwqwv1','SELECT ``\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','error',NULL,5,'Unknown column \'\' in \'field list\'','2026-03-19 06:17:23'),('sllr284go1wn7m9tr1fmkb2m','SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-18 16:12:09'),('snbv5fkov36l9bhu5q3pfoqz','\nSELECT * FROM datasets LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-19 06:04:27'),('t0cdfvdiyn8ccqh3kqa8j3vu','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-18 18:33:35'),('tdlm0vgzp976ivf1fe0at1kb','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,11,NULL,'2026-03-19 13:50:05'),('tk4e170nqwpzzqztzuln67f9','SELECT * FROM dashboards LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',0,7,NULL,'2026-03-18 16:11:56'),('tv4h5o9peygtpqkvf7z5eyyz','SELECT ``\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,3,'Unknown column \'\' in \'field list\'','2026-03-19 06:56:25'),('twl113p2fr96kx0puemehxxi','SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id;','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,3,'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'LIMIT 10000\' at line 8','2026-03-19 06:20:44'),('u7kx7aamj3cji1adje2nm7z2','SELECT `order_date`, `amount`, `country`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,4,NULL,'2026-03-19 07:29:00'),('u8s7ip9n6vm3dk8z3luq3tdo','SELECT\n  *\nFROM\n  users\nLIMIT\n  100\nSELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','error',NULL,3,'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'SELECT * FROM users LIMIT 100\' at line 7','2026-03-18 16:37:46'),('uf3kwuskjjaqbgdvmh295ttf','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,3,NULL,'2026-03-18 16:58:07'),('uocrhf6xrkir5udjsltsluik','SELECT * FROM charts LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','success',0,16,NULL,'2026-03-18 16:10:55'),('uxspas1yfdj2ewd6eumd3u74','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,7,NULL,'2026-03-19 11:58:55'),('uzeb6nekdtmdfh5f369artf5','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,7,NULL,'2026-03-19 08:03:41'),('v6e4c5dyp4if9ck6mbx95jdt','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,15,NULL,'2026-03-19 13:35:11'),('v6rm1kfufh07y2rc7kn2quh9','SELECT `order_date`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 09:24:36'),('vj5my8vkyhgzswx2fwz18c7f','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-19 06:23:39'),('vt56v6872h1cdh70ihb7kpc5','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,15,NULL,'2026-03-19 09:28:16'),('w01prtbfewx2kwjamtqpi39n','SELECT * FROM (SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','error',NULL,12,'Unknown column \'id\' in \'where clause\'','2026-03-19 10:17:45'),('w3x78uny2pzxqhlygdcu1nwg','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,22,NULL,'2026-03-19 09:05:41'),('w650zdrgf04tol9v49n8n65m','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,3,NULL,'2026-03-18 17:58:08'),('w95o3lxctkngrqbzn3zidqv7','SELECT `order_date`, `amount`, `id`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,4,NULL,'2026-03-19 07:29:03'),('wkhfbj8um4buce9zv4siyqh6','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,6,NULL,'2026-03-19 11:51:28'),('wshi9jt6tnfz31fq4m7xbc2n','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,7,NULL,'2026-03-19 13:35:11'),('x8ca0mag0l20dc2ofvykrvbq','SELECT `order_date`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,8,NULL,'2026-03-19 07:19:42'),('xal9c6cuovejmk5umesdylpp','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,18,NULL,'2026-03-19 11:14:47'),('xbmzy5sdc4y5vvupd3fnq43j','SELECT * FROM (SELECT *\nFROM `users`) AS __filtered__ WHERE `id` = \'z9vzcq57t76fb6x0rz8gvdig\'','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,15,NULL,'2026-03-19 10:17:45'),('xcxly7of2u2cwt1dyswv43dp','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,9,NULL,'2026-03-19 10:56:41'),('xgp683vbw3dlaxp666z3d2pr','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,5,NULL,'2026-03-18 17:48:04'),('xksos6x5x3qdnm3yusm6emlt','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,5,NULL,'2026-03-19 12:12:04'),('xlxsrszcdxkbp5zh9uq2bji5','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,2,NULL,'2026-03-19 09:28:16'),('xvessa7h3jnoek084ltofqcv','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,9,NULL,'2026-03-19 07:02:35'),('xx355mvnqlrb1yinnlyblkb5','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,6,NULL,'2026-03-19 07:19:55'),('y1n5568obqd93bmk4h4vbqz8','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,4,NULL,'2026-03-19 11:20:02'),('ygdg4finet4boa0hfdhaey59','SELECT *\nFROM `users`','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','success',1,4,NULL,'2026-03-19 07:36:59'),('zdpugyhxg4c4wzygjwzsq6i6','SELECT `order_date`, `amount`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,21,NULL,'2026-03-19 07:36:59'),('ztsucafoi18665j8nkqq7z8j','SELECT `order_date`, `amount`, `status`\nFROM (SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id) AS __dataset__','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','success',50,4,NULL,'2026-03-19 07:28:56');
/*!40000 ALTER TABLE `query_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_queries`
--

DROP TABLE IF EXISTS `saved_queries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_queries` (
  `id` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `sql` text NOT NULL,
  `connection_id` varchar(128) NOT NULL,
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `saved_queries_connection_id_database_connections_id_fk` (`connection_id`),
  KEY `saved_queries_created_by_users_id_fk` (`created_by`),
  CONSTRAINT `saved_queries_connection_id_database_connections_id_fk` FOREIGN KEY (`connection_id`) REFERENCES `database_connections` (`id`),
  CONSTRAINT `saved_queries_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_queries`
--

LOCK TABLES `saved_queries` WRITE;
/*!40000 ALTER TABLE `saved_queries` DISABLE KEYS */;
INSERT INTO `saved_queries` VALUES ('ctdpz9ktlvtlpel99lnks2j5','UsersList',NULL,'SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','2026-03-18 16:38:36','2026-03-18 16:38:36'),('dun5wtjbfzaoyi1wnav2i2f0','UsersQuery',NULL,'SELECT * FROM users LIMIT 100','m5g9r38r3e6y3pvmnzuyb078','z9vzcq57t76fb6x0rz8gvdig','2026-03-18 16:53:18','2026-03-18 16:53:18'),('hsr1e0mly5cqapproqi25b1v','UsersList',NULL,'SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','2026-03-18 16:38:45','2026-03-18 16:38:45'),('ibbfo8lqu17nqu7il0sjyoqf','UsersList',NULL,'SELECT * FROM users LIMIT 100','vcxkjy4vmmhsx6diexpwr28c','z9vzcq57t76fb6x0rz8gvdig','2026-03-18 16:38:04','2026-03-18 16:38:04'),('wf8jf6lvosoqwuiia0jj4r57','CustomerOrdersQuery',NULL,'SELECT \n    o.id,\n    o.order_date,\n    o.amount,\n    o.status,\n    c.country\nFROM orders o\nJOIN customers c ON o.customer_id = c.id','xg5aojj2387k3umy9t3odjvw','z9vzcq57t76fb6x0rz8gvdig','2026-03-19 06:22:06','2026-03-19 06:22:06');
/*!40000 ALTER TABLE `saved_queries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(128) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','alpha','gamma','public') NOT NULL DEFAULT 'gamma',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('z9vzcq57t76fb6x0rz8gvdig','admin@gmail.com','Admin','$2b$12$ajZjjGePojUcgJFp9RyczuDNeRBmIiYE0.9GtgiRFKB5DJKeFqr7y','admin','2026-03-18 14:59:58','2026-03-18 15:00:24');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-19 21:54:46
