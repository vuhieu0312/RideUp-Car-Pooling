-- Bỏ ward.code: seeder không điền nên luôn NULL, không API/app nào dùng.
-- Chạy SAU KHI đã deploy backend mới (ddl-auto: update không tự xoá cột).
-- Index trên cột code (idx_ward_code, hoặc UNIQUE cũ) tự bị xoá cùng cột.

USE rideup;

ALTER TABLE ward
  DROP COLUMN code;
