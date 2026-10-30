-- Tạo tài khoản quản trị (ADMIN) đầu tiên. Hệ thống không có màn đăng ký admin.
-- Chạy SAU khi backend đã khởi động ít nhất 1 lần (để Hibernate tạo bảng).
-- Đăng nhập app quản trị bằng:  admin@rideup.vn  /  Admin@123   (nhớ đổi mật khẩu sau khi vào được)

USE rideup;

SET @admin_id := UUID();

INSERT INTO app_user (id, full_name, email, phone, password, verified, created_at, updated_at)
VALUES (@admin_id, 'Quản trị viên', 'admin@rideup.vn', '0900000000',
        '$2a$10$Y.CDrzRTUCgrn49xQ/.rFuwrETosOIzrzanC0hz2VhU2Q5huZjTR.',  -- BCrypt của "Admin@123"
        1, NOW(), NOW());

INSERT INTO user_roles (user_id, role) VALUES (@admin_id, 'ADMIN');

-- Kiểm tra
SELECT u.email, r.role FROM app_user u JOIN user_roles r ON r.user_id = u.id WHERE r.role = 'ADMIN';
