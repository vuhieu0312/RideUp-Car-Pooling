-- Cho phép 1 tài xế có nhiều xe (đổi xe) và cho dùng lại biển số của xe đã ngừng dùng / bị từ chối:
-- bỏ unique trên vehicle.driver_id và vehicle.plate_number (uk_vehicle_plate của schema cũ, nếu có).
-- Trùng biển số giờ do backend kiểm tra, chỉ tính các xe đang dùng hoặc đang chờ duyệt.
-- Chạy 1 lần trước khi chạy backend mới (chạy lại nhiều lần cũng không lỗi). ddl-auto: update không tự xoá index.
USE rideup;

-- 1) FK driver_id cần một index thường trước khi bỏ index unique
SET @has_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle'
      AND COLUMN_NAME = 'driver_id' AND NON_UNIQUE = 1 AND SEQ_IN_INDEX = 1
);
SET @sql := IF(@has_idx > 0, 'SELECT 1', 'CREATE INDEX idx_vehicle_driver ON vehicle (driver_id)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Bỏ unique trên driver_id
SET @uk := (
    SELECT INDEX_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle'
      AND COLUMN_NAME = 'driver_id' AND NON_UNIQUE = 0
    LIMIT 1
);
SET @sql := IF(@uk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE vehicle DROP INDEX `', @uk, '`'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Bỏ unique trên plate_number
SET @uk := (
    SELECT INDEX_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle'
      AND COLUMN_NAME = 'plate_number' AND NON_UNIQUE = 0
    LIMIT 1
);
SET @sql := IF(@uk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE vehicle DROP INDEX `', @uk, '`'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
