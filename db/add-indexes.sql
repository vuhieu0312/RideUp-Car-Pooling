-- Thêm index cho các truy vấn hay dùng (chạy MỘT lần trên database rideup).
-- Nếu báo "Duplicate key name" nghĩa là index đã tồn tại, bỏ qua dòng đó.

-- Chuyến: tìm kiếm theo trạng thái + giờ đi, danh sách chuyến của tài xế
CREATE INDEX idx_trip_status_departure ON trip (status, departure_time);
CREATE INDEX idx_trip_driver_departure ON trip (driver_id, departure_time);

-- Booking: danh sách của khách, quét hết hạn (scheduler chạy mỗi phút), đếm theo chuyến
CREATE INDEX idx_booking_customer_created ON booking (customer_id, created_at);
CREATE INDEX idx_booking_status_expires ON booking (status, expires_at);
CREATE INDEX idx_booking_trip_status ON booking (trip_id, status);
