-- Vehicle.driverId (String) -> Vehicle.driverProfile (@OneToOne DriverProfile).
-- Cột vẫn tên vehicle.driver_id (= driver_profile.id), chỉ thêm khoá ngoại.
-- Hibernate (ddl-auto: update) thường tự thêm FK khi khởi động; nếu DB có dữ liệu "mồ côi"
-- thì Hibernate chỉ log WARN và bỏ qua -> chạy script này để dọn và thêm FK bằng tay.
-- Chạy SAU KHI đã deploy backend mới (tắt backend trước khi chạy).

USE rideup;

-- 1) Xe trỏ tới driver_profile không tồn tại (phải = 0 dòng)
SELECT v.id, v.plate_number, v.driver_id
FROM vehicle v
LEFT JOIN driver_profile dp ON dp.id = v.driver_id
WHERE dp.id IS NULL;

-- 2) Nếu bước 1 có dòng: xem chuyến nào đang dùng các xe đó, rồi mới xoá (bỏ comment khi chắc chắn)
-- SELECT t.id, t.status FROM trip t
-- WHERE t.vehicle_id IN (SELECT v.id FROM vehicle v
--                        LEFT JOIN driver_profile dp ON dp.id = v.driver_id WHERE dp.id IS NULL);
-- DELETE v FROM vehicle v LEFT JOIN driver_profile dp ON dp.id = v.driver_id WHERE dp.id IS NULL;

-- 3) Thêm FK (bỏ qua nếu báo "Duplicate foreign key constraint name" — Hibernate đã thêm rồi)
ALTER TABLE vehicle
  ADD CONSTRAINT fk_vehicle_driver_profile
  FOREIGN KEY (driver_id) REFERENCES driver_profile(id);
