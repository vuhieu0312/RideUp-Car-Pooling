-- Xóa các cột không còn dùng. Hibernate ddl-auto=update KHÔNG tự xóa cột nên phải chạy tay.
-- THỨ TỰ BẮT BUỘC: chạy backend bản mới (entity đã bỏ các field này) trước, rồi mới chạy file này.
-- Nếu chạy khi backend cũ còn chạy, câu SELECT sẽ báo lỗi "Unknown column".
-- Khuyên sao lưu trước:  mysqldump rideup > backup-truoc-khi-xoa-cot.sql

USE rideup;

-- Bước 1 (tùy chọn): xem các cột này có dữ liệu thật không (kỳ vọng: toàn 0).
SELECT
  (SELECT COUNT(*) FROM payment WHERE pay_date IS NOT NULL)                        AS payment_pay_date,
  (SELECT COUNT(*) FROM booking WHERE trip_version_at_reserve IS NOT NULL)         AS booking_trip_version,
  (SELECT COUNT(*) FROM trip    WHERE start_ward_id IS NOT NULL)                   AS trip_start_ward,
  (SELECT COUNT(*) FROM trip    WHERE end_ward_id   IS NOT NULL)                   AS trip_end_ward;

-- Bước 2: xóa cột.
ALTER TABLE payment DROP COLUMN pay_date;
ALTER TABLE booking DROP COLUMN trip_version_at_reserve;
ALTER TABLE trip    DROP COLUMN start_ward_id,
                    DROP COLUMN end_ward_id;

-- Bước 3 (tùy chọn): xóa bảng sao lưu cũ. Thay đúng tên bảng của bạn (xem bằng SHOW TABLES).
-- DROP TABLE booking_backup_2026xxxx;

-- Kiểm tra lại.
DESCRIBE payment;
DESCRIBE booking;
DESCRIBE trip;
