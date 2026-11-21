-- Nạp ví bằng PaymentSheet: cột wallet_transaction.stripe_session_id đổi tên thành stripe_reference
-- (lưu mã Checkout Session hoặc PaymentIntent của lần nạp). Chạy 1 lần, sau khi đã chạy backend mới.
USE rideup;

SET @has_old := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_transaction' AND COLUMN_NAME = 'stripe_session_id'
);
SET @has_new := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_transaction' AND COLUMN_NAME = 'stripe_reference'
);

SET @sql := IF(@has_old > 0 AND @has_new > 0,
    'UPDATE wallet_transaction SET stripe_reference = stripe_session_id WHERE stripe_reference IS NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_old > 0 AND @has_new > 0,
    'ALTER TABLE wallet_transaction DROP COLUMN stripe_session_id',
    IF(@has_old > 0,
        'ALTER TABLE wallet_transaction CHANGE stripe_session_id stripe_reference VARCHAR(100) NULL',
        'SELECT 1'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
