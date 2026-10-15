-- GHI CHÚ: DB đã có sẵn UNIQUE trên payment.booking_id (index do Hibernate tạo,
-- tên dạng UKku02qy6369hn9uhy3n7jk9v6e, Non_unique = 0), nên quan hệ booking-payment
-- đã được ép 1-1 ở tầng DB. KHÔNG cần thêm UNIQUE nữa.
-- (MySQL Workbench vẽ chân chim 1-n vì nó vẽ theo khóa ngoại, không phải do thiếu ràng buộc.)

-- Nếu bạn đã lỡ chạy "ALTER TABLE payment ADD CONSTRAINT uk_payment_booking UNIQUE (booking_id)"
-- thì index đó bị trùng. Xóa nó bằng lệnh dưới (chạy một lần):
ALTER TABLE payment DROP INDEX uk_payment_booking;

-- Kiểm tra: phải còn đúng 2 index (PRIMARY và UK... trên booking_id).
SHOW INDEX FROM payment;
