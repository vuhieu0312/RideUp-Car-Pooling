-- Nâng wallet_transaction.booking_id thành khóa ngoại tới booking(id).
-- Chạy SAU KHI đã chạy backend mới ít nhất 1 lần (Hibernate có thể đã tự tạo khóa ngoại; script này bỏ qua nếu đã có). Chạy lại nhiều lần vẫn an toàn.
USE rideup;

-- Giao dịch trỏ tới booking không còn tồn tại thì bỏ liên kết (giữ nguyên dòng ví).
UPDATE wallet_transaction w
LEFT JOIN booking b ON b.id = w.booking_id
SET w.booking_id = NULL
WHERE w.booking_id IS NOT NULL AND b.id IS NULL;

SET @has_fk := (
    SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_transaction'
      AND COLUMN_NAME = 'booking_id' AND REFERENCED_TABLE_NAME = 'booking'
);
SET @sql := IF(@has_fk = 0,
    'ALTER TABLE wallet_transaction ADD CONSTRAINT fk_wallet_transaction_booking FOREIGN KEY (booking_id) REFERENCES booking (id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
