-- Đổi các cột ENUM còn lại sang VARCHAR để khớp @JdbcTypeCode(VARCHAR) trong entity (thêm giá trị enum mới không cần ALTER).
-- Thu gọn cột refresh_token.token (chỉ lưu chuỗi băm SHA-256 dạng Base64, 44 ký tự) từ 768 xuống 128.
-- Chạy 1 lần, khi backend đang tắt. Chạy lại vẫn an toàn. Bảng nào chưa tồn tại (ví dụ refund) thì bỏ qua dòng đó.
USE rideup;

ALTER TABLE app_user       MODIFY COLUMN gender         VARCHAR(255) NULL;
ALTER TABLE app_user       MODIFY COLUMN account_status VARCHAR(20)  NOT NULL;
ALTER TABLE app_user       MODIFY COLUMN role           VARCHAR(20)  NOT NULL;
ALTER TABLE driver_profile MODIFY COLUMN status         VARCHAR(20)  NOT NULL;
ALTER TABLE trip           MODIFY COLUMN status         VARCHAR(20)  NOT NULL;
ALTER TABLE trip_stop      MODIFY COLUMN stop_type      VARCHAR(20)  NOT NULL;
ALTER TABLE vehicle        MODIFY COLUMN vehicle_type   VARCHAR(20)  NOT NULL;
ALTER TABLE report         MODIFY COLUMN category       VARCHAR(30)  NOT NULL;
ALTER TABLE report         MODIFY COLUMN status         VARCHAR(20)  NOT NULL;
ALTER TABLE refund         MODIFY COLUMN status         VARCHAR(20)  NOT NULL;

ALTER TABLE refresh_token  MODIFY COLUMN token          VARCHAR(128) NOT NULL;
