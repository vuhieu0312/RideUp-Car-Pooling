-- RideUp: Schema patches cho Hibernate ddl-auto: update không tự động làm.
-- Chạy 1 lần sau khi DB khởi tạo (hoặc khi gặp lỗi "Column 'code' cannot be null").
--
-- Lý do: Ward entity nullable code (cho phép OSM fetch thiếu code), nhưng column DB
-- ban đầu được tạo ra từ V1__init.sql với NOT NULL UNIQUE. Hibernate không drop
-- constraint khi entity đổi — cần ALTER thủ công.

USE rideup;

-- Cho phép code NULL
ALTER TABLE ward MODIFY COLUMN code VARCHAR(20) NULL;

-- Bỏ UNIQUE trên code (nếu tồn tại — tên auto-generated có thể khác nhau giữa các version)
SET @drop_idx = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = 'ward'
       AND index_name = 'uk_ward_code') > 0,
    'DROP INDEX uk_ward_code ON ward',
    'SELECT 0'
));
PREPARE stmt FROM @drop_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Fallback: nếu tên index auto-gen khác (vd UKj1cxnlf7eryyc0l0h20ks4psr), drop luôn
SET @drop_idx2 = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = 'ward'
       AND index_name LIKE 'UK%'
       AND column_name = 'code') > 0,
    (SELECT CONCAT('DROP INDEX ', index_name, ' ON ward')
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = 'ward'
       AND index_name LIKE 'UK%'
       AND column_name = 'code' LIMIT 1),
    'SELECT 0'
));
PREPARE stmt2 FROM @drop_idx2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Verify kết quả
SHOW CREATE TABLE ward\G
