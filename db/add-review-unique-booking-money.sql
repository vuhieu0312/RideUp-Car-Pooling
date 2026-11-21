-- 1) review: mỗi khách chỉ đánh giá 1 lần cho 1 chuyến (unique trip_id + customer_id). Đánh giá trùng thì giữ cái cũ nhất.
-- 2) booking: price_per_seat, total_amount chuyển sang decimal(15,2) cho khớp payment.amount.
-- Chạy 1 lần, khi backend đang tắt. Chạy lại nhiều lần vẫn an toàn.
USE rideup;

DELETE r1 FROM review r1
JOIN review r2
  ON r1.trip_id = r2.trip_id AND r1.customer_id = r2.customer_id
 AND (r1.created_at > r2.created_at OR (r1.created_at = r2.created_at AND r1.id > r2.id));

SET @has_uk := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review' AND INDEX_NAME = 'uk_review_trip_customer'
);
SET @sql := IF(@has_uk = 0,
    'ALTER TABLE review ADD CONSTRAINT uk_review_trip_customer UNIQUE (trip_id, customer_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE booking MODIFY COLUMN price_per_seat DECIMAL(15,2) NULL;
ALTER TABLE booking MODIFY COLUMN total_amount   DECIMAL(15,2) NULL;
