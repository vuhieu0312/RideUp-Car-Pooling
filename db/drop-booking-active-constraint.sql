-- =============================================================
-- Fix: xoá unique constraint sai trên bảng booking.
--
-- Constraint uk_booking_active_per_customer_trip (customer_id, trip_id, status)
-- đáng lẽ chỉ nên chặn "2 booking ACTIVE cùng lúc cho 1 trip", nhưng vì MySQL
-- không có partial/filtered unique index nên nó chặn luôn CẢ status đã huỷ:
-- nếu customer đã có 1 booking CANCELLED_BY_USER cho 1 trip, lần huỷ booking
-- thứ 2 (khác id) cho CÙNG trip đó sẽ bị MySQL từ chối vì trùng
-- (customer_id, trip_id, 'CANCELLED_BY_USER') — lỗi hiện ra đúng ngay khi
-- bấm "Huỷ booking" chứ không phải lúc đặt mới.
--
-- Rule thật ("tối đa 1 booking ACTIVE/trip") đã được check đúng ở tầng service
-- (BookingService#createBookingInternal), nên bỏ hẳn constraint này.
--
-- MySQL đang dùng uk_booking_active_per_customer_trip làm index "hỗ trợ" cho
-- foreign key fk_booking_customer (customer_id -> app_user.id), vì không có
-- index nào khác bắt đầu bằng customer_id. Phải tạo index riêng cho
-- customer_id TRƯỚC thì mới DROP được unique key kia (lỗi 1553).
--
-- Chạy 1 lần trên DB dev/staging đang có constraint cũ. Hibernate
-- (ddl-auto=update) sẽ KHÔNG tự xoá, nên phải chạy tay script này.
-- =============================================================

-- 1. Tạo index thay thế cho FK fk_booking_customer (bỏ qua nếu đã có sẵn,
--    ví dụ idx_booking_customer từ db/_backup/V1__init.sql).
SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'booking'
      AND index_name = 'idx_booking_customer'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX idx_booking_customer ON booking (customer_id)',
    'SELECT ''idx_booking_customer already exists, skip'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Giờ có thể xoá unique key sai mà không ảnh hưởng FK.
ALTER TABLE booking DROP INDEX uk_booking_active_per_customer_trip;
