-- Chuyển role cũ từ user_roles sang cột app_user.role.
-- Chỉ chạy khi DB còn bảng user_roles; dừng backend trước khi chạy.
USE rideup;

-- Kiểm tra trước. Nếu có user nhiều role, xử lý các dòng đó trước khi tiếp tục.
SELECT user_id, COUNT(*) AS role_count
FROM user_roles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Hibernate có thể đã thêm cột role nhưng chưa backfill role cũ.
SET @role_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user'
      AND column_name = 'role'
);
SET @add_role_column_sql = IF(
    @role_column_exists = 0,
    'ALTER TABLE app_user ADD COLUMN role VARCHAR(20) NULL',
    'SELECT 1'
);
PREPARE add_role_column_stmt FROM @add_role_column_sql;
EXECUTE add_role_column_stmt;
DEALLOCATE PREPARE add_role_column_stmt;

UPDATE app_user u
JOIN (
    SELECT user_id, MIN(role) AS role
    FROM user_roles
    GROUP BY user_id
    HAVING COUNT(*) = 1
) r ON r.user_id = u.id
SET u.role = r.role
WHERE u.role IS NULL OR u.role = '';

-- Phải không còn user thiếu role trước khi đặt cột NOT NULL.
SELECT id, email
FROM app_user
WHERE role IS NULL OR role = '';

ALTER TABLE app_user MODIFY role VARCHAR(20) NOT NULL;

-- Xác nhận dữ liệu đã được phân loại.
SELECT role, COUNT(*) AS user_count
FROM app_user
GROUP BY role
ORDER BY role;
