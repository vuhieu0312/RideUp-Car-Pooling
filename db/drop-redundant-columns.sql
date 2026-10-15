-- Xóa các cột dư thừa / trùng lặp. Hibernate ddl-auto=update KHÔNG tự xóa cột nên phải chạy tay.
--
-- THỨ TỰ BẮT BUỘC: tắt backend → chạy file này → chạy backend bản mới.
--   * booking.payment_status đang NOT NULL: nếu backend mới chạy trước khi xóa cột,
--     lúc tạo booking sẽ lỗi "Field 'payment_status' doesn't have a default value".
--   * Nếu backend cũ còn chạy sau khi xóa cột, các câu SELECT sẽ báo "Unknown column".
-- Khuyên sao lưu trước:  mysqldump rideup > backup-truoc-khi-xoa-cot-du.sql
--
-- Lý do từng cột:
--   booking.payment_status   trùng payment.status và bị lệch (capture/cancel không cập nhật) → lấy từ payment
--   booking.reserved_at      luôn bằng created_at
--   payment.correlation_id   chỉ là bản sao booking.booking_code
--   payment.payment_url      đang chứa Stripe client_secret (bị trả về trong API booking) → giờ lấy lại từ Stripe khi cần
--   trip.start_address_text, trip.end_address_text   app không gửi, luôn NULL (TripStop.address_text đã có)
--   trip.estimated_arrival_time                      app không gửi, luôn NULL

USE rideup;

-- Bước 1 (tùy chọn): xem các cột trip có dữ liệu thật không (kỳ vọng: toàn 0).
SELECT
  (SELECT COUNT(*) FROM trip WHERE start_address_text IS NOT NULL)      AS trip_start_address,
  (SELECT COUNT(*) FROM trip WHERE end_address_text IS NOT NULL)        AS trip_end_address,
  (SELECT COUNT(*) FROM trip WHERE estimated_arrival_time IS NOT NULL)  AS trip_eta;

-- Bước 2: xóa cột.
ALTER TABLE booking DROP COLUMN payment_status,
                    DROP COLUMN reserved_at;
ALTER TABLE payment DROP COLUMN correlation_id,
                    DROP COLUMN payment_url;
ALTER TABLE trip    DROP COLUMN start_address_text,
                    DROP COLUMN end_address_text,
                    DROP COLUMN estimated_arrival_time;

-- Kiểm tra lại.
DESCRIBE booking;
DESCRIBE payment;
DESCRIBE trip;
