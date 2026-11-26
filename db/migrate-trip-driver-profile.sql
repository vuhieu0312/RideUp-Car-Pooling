-- Chuyển trip.driver_id (trỏ tới app_user) sang trip.driver_profile_id (trỏ tới driver_profile).
-- Tắt backend rồi chạy 1 lần, TRƯỚC khi chạy backend mới. Nên sao lưu DB trước (mysqldump).
-- Nếu còn chuyến không tìm được hồ sơ tài xế, script dừng ở bước 3 và không xoá cột cũ.
USE rideup;

-- 1. Thêm cột mới, tạm cho phép NULL
ALTER TABLE trip ADD COLUMN driver_profile_id VARCHAR(36) NULL;

-- 2. Điền hồ sơ tài xế tương ứng với tài khoản đang lưu ở driver_id
-- (tắt Safe Updates của MySQL Workbench, nếu không câu UPDATE bị chặn với lỗi 1175)
SET SQL_SAFE_UPDATES = 0;
UPDATE trip t
JOIN driver_profile dp ON dp.user_id = t.driver_id
SET t.driver_profile_id = dp.id;
SET SQL_SAFE_UPDATES = 1;

-- 3. Kiểm tra: phải bằng 0 thì các bước sau mới chạy
SET @missing := (SELECT COUNT(*) FROM trip WHERE driver_profile_id IS NULL);
SELECT @missing AS so_chuyen_khong_co_ho_so_tai_xe;

-- 4. Xoá khoá ngoại cũ trên driver_id (tên do Hibernate sinh)
SET @fk := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = 'rideup' AND TABLE_NAME = 'trip'
              AND COLUMN_NAME = 'driver_id' AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1);
SET @sql := IF(@missing = 0 AND @fk IS NOT NULL, CONCAT('ALTER TABLE trip DROP FOREIGN KEY ', @fk), 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 5. Xoá index cũ idx_trip_driver_departure (đang đặt trên driver_id)
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = 'rideup' AND TABLE_NAME = 'trip' AND INDEX_NAME = 'idx_trip_driver_departure');
SET @sql := IF(@missing = 0 AND @idx > 0, 'ALTER TABLE trip DROP INDEX idx_trip_driver_departure', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 6. Xoá cột cũ driver_id
SET @sql := IF(@missing = 0, 'ALTER TABLE trip DROP COLUMN driver_id', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 7. Cột mới bắt buộc có giá trị, thêm khoá ngoại và index
SET @sql := IF(@missing = 0, 'ALTER TABLE trip MODIFY driver_profile_id VARCHAR(36) NOT NULL', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql := IF(@missing = 0, 'ALTER TABLE trip ADD CONSTRAINT fk_trip_driver_profile FOREIGN KEY (driver_profile_id) REFERENCES driver_profile (id)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql := IF(@missing = 0, 'CREATE INDEX idx_trip_driver_departure ON trip (driver_profile_id, departure_time)', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 8. Kết quả
SHOW CREATE TABLE trip;
