-- Xoá bảng refund (entity Refund đã bị xoá khỏi code, chưa có chức năng hoàn tiền dùng tới).
-- Chạy 1 lần SAU khi đã chạy backend mới.
USE rideup;

DROP TABLE IF EXISTS refund;
