-- Chuyển user <-> role từ 1-n (bảng user_roles) sang 1-1 (cột app_user.role).
USE rideup;

-- 1. Kiểm tra: kết quả phải là 0 dòng. Nếu có dòng, user đó đang có nhiều role,
--    cần quyết định giữ role nào trước khi chạy tiếp.
SELECT user_id, COUNT(*) AS role_count FROM user_roles GROUP BY user_id HAVING COUNT(*) > 1;

-- 2. Thêm cột, copy dữ liệu, ràng buộc NOT NULL, xoá bảng cũ
ALTER TABLE app_user ADD COLUMN role VARCHAR(20) NULL;

SET SQL_SAFE_UPDATES = 0;
UPDATE app_user u JOIN user_roles r ON r.user_id = u.id SET u.role = r.role;
SET SQL_SAFE_UPDATES = 1;

-- 3. Kiểm tra: kết quả phải là 0 dòng (không user nào thiếu role)
SELECT id, email FROM app_user WHERE role IS NULL;

ALTER TABLE app_user MODIFY role VARCHAR(20) NOT NULL;
DROP TABLE user_roles;
