-- Chức năng thông báo: cột type/status của bảng notification chuyển từ ENUM sang VARCHAR (thêm loại thông báo không cần đổi DB nữa)
-- và thêm cột dedup_key (chống tạo trùng thông báo cho cùng một sự kiện).
-- Chạy 1 lần trước khi chạy backend mới. Nếu bảng notification chưa tồn tại thì bỏ qua file này, Hibernate sẽ tự tạo đúng.
USE rideup;

ALTER TABLE notification MODIFY COLUMN type VARCHAR(40) NOT NULL;
ALTER TABLE notification MODIFY COLUMN status VARCHAR(20) NOT NULL;

SET @has_col := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification' AND COLUMN_NAME = 'dedup_key'
);
SET @sql := IF(@has_col > 0, 'SELECT 1', 'ALTER TABLE notification ADD COLUMN dedup_key VARCHAR(120) NULL');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification' AND INDEX_NAME = 'idx_notification_user_created'
);
SET @sql := IF(@has_idx > 0, 'SELECT 1', 'CREATE INDEX idx_notification_user_created ON notification (user_id, created_at)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
