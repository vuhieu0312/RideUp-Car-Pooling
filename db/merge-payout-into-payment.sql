-- Gộp driver_payout_transaction vào bảng payment (commission_amount, debt_deducted, stripe_transfer_id, payout_status).
-- Chạy SAU KHI đã chạy backend mới ít nhất 1 lần (Hibernate đã thêm 4 cột mới vào bảng payment). Chạy lại nhiều lần vẫn an toàn.
USE rideup;

SET @has_tbl := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driver_payout_transaction'
);
SET @sql := IF(@has_tbl > 0,
    'UPDATE payment p JOIN driver_payout_transaction x ON x.booking_id = p.booking_id SET p.commission_amount = x.commission_amount, p.debt_deducted = x.debt_deducted, p.stripe_transfer_id = x.stripe_transfer_id, p.payout_status = x.status',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TABLE IF EXISTS driver_payout_transaction;

SET @has_fee := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment' AND COLUMN_NAME = 'platform_fee'
);
SET @has_tr := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment' AND COLUMN_NAME = 'transfer_id'
);

SET @sql := IF(@has_fee > 0 AND @has_tr > 0,
    'UPDATE payment SET commission_amount = COALESCE(platform_fee, 0), debt_deducted = 0, stripe_transfer_id = CASE WHEN transfer_id LIKE ''tr\\_%'' THEN transfer_id ELSE NULL END, payout_status = CASE WHEN transfer_id LIKE ''offset-%'' THEN ''OFFSET_BY_DEBT'' ELSE ''COMPLETED'' END WHERE commission_amount IS NULL AND transfer_id IS NOT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_fee > 0, 'ALTER TABLE payment DROP COLUMN platform_fee', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_tr > 0, 'ALTER TABLE payment DROP COLUMN transfer_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
