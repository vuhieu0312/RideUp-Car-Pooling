-- Tạo database + user cho RideUp (chạy 1 lần với quyền root MySQL)
CREATE DATABASE IF NOT EXISTS rideup
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Nếu muốn tạo user riêng (khuyến nghị):
-- CREATE USER IF NOT EXISTS 'rideup'@'localhost' IDENTIFIED BY 'rideup123';
-- GRANT ALL PRIVILEGES ON rideup.* TO 'rideup'@'localhost';
-- FLUSH PRIVILEGES;
