-- Tạo tài khoản quản trị (ADMIN) đầu tiên. Hệ thống không có màn đăng ký admin.
-- Chạy SAU khi backend đã khởi động ít nhất 1 lần (để Hibernate tạo bảng).
-- Đăng nhập app quản trị bằng:  admin@rideup.vn  /  Admin@123   (nhớ đổi mật khẩu sau khi vào được)

USE rideup;

SET @admin_id := UUID();

INSERT INTO app_user (id, full_name, email, phone, password, role, created_at, updated_at)
VALUES (@admin_id, 'Quản trị viên', 'admin@rideup.vn', '0900000000',
        '$2a$10$Y.CDrzRTUCgrn49xQ/.rFuwrETosOIzrzanC0hz2VhU2Q5huZjTR.',  -- BCrypt của "Admin@123"
        'ADMIN', NOW(), NOW());

-- Kiểm tra
SELECT email, role FROM app_user WHERE role = 'ADMIN';
