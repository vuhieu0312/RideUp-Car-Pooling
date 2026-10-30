-- Bỏ trip.pickup_lat / trip.pickup_lng: không app nào gửi, không API nào trả, luôn NULL.
-- Điểm đón của chuyến nằm ở trip_stop (PICKUP) + ward.lat/lng.
-- (booking.pickup_lat/lng vẫn giữ — đó là vị trí đón khách chọn trên bản đồ.)
-- Chạy SAU KHI đã deploy backend mới (ddl-auto: update không tự xoá cột).

USE rideup;

ALTER TABLE trip
  DROP COLUMN pickup_lat,
  DROP COLUMN pickup_lng;
