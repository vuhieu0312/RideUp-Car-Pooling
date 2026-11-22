-- Xoá cột app_user.verified (luôn = 1, không dùng trong nghiệp vụ).
-- Chạy 1 lần SAU khi đã chạy backend mới.
USE rideup;

ALTER TABLE app_user DROP COLUMN verified;
