-- Bỏ ward.display_name: trùng với name, không API/app nào dùng.
-- Chạy SAU KHI đã deploy backend mới (ddl-auto: update không tự xoá cột).

USE rideup;

ALTER TABLE ward
  DROP COLUMN display_name;
