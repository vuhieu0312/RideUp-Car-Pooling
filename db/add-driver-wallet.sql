-- Ví hoa hồng tài xế: thêm cột wallet_balance (âm = đang nợ hoa hồng tiền mặt).
-- Chạy 1 lần trước khi chạy backend mới. Bảng wallet_transaction do Hibernate tự tạo.
USE rideup;

SET @has_col := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driver_profile' AND COLUMN_NAME = 'wallet_balance'
);
SET @sql := IF(@has_col > 0, 'SELECT 1',
    'ALTER TABLE driver_profile ADD COLUMN wallet_balance DECIMAL(15,2) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
