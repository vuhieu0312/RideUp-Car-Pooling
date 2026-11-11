-- Bỏ vehicle.insurance_image / vehicle.insurance_expiry_date: không còn dùng bảo hiểm trong hệ thống.
-- Chạy SAU KHI đã deploy backend mới (ddl-auto: update không tự xoá cột).

USE rideup;

ALTER TABLE vehicle
  DROP COLUMN insurance_image,
  DROP COLUMN insurance_expiry_date;
