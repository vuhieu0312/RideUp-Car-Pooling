-- =============================================================
-- Migration: BookingStatus enum cũ -> enum mới
-- Chạy script này trên DB dev/staging khi deploy code mới.
-- Mapping:
--   PENDING          -> PENDING_PAYMENT
--   PICKED_UP        -> CONFIRMED           (đã đón khách = đã driver duyệt)
--   CANCELLED_USER   -> CANCELLED_BY_USER
-- =============================================================

-- Backup trước khi chạy:
-- CREATE TABLE booking_backup_20261014 AS SELECT * FROM booking;

START TRANSACTION;

-- Xem trước bao nhiêu row sẽ bị ảnh hưởng:
SELECT status, COUNT(*) AS row_count
FROM booking
WHERE status IN ('PENDING', 'PICKED_UP', 'CANCELLED_USER')
GROUP BY status;

-- 1. PENDING -> PENDING_PAYMENT
UPDATE booking
SET status = 'PENDING_PAYMENT'
WHERE status = 'PENDING';

-- 2. PICKED_UP -> CONFIRMED (booking đã được driver duyệt + đón khách
--    trước flow mới. Sau trip kết thúc sẽ auto-flip sang COMPLETED.)
UPDATE booking
SET status = 'CONFIRMED'
WHERE status = 'PICKED_UP';

-- 3. CANCELLED_USER -> CANCELLED_BY_USER (đổi tên enum)
UPDATE booking
SET status = 'CANCELLED_BY_USER'
WHERE status = 'CANCELLED_USER';

-- Verify sau migration:
SELECT status, COUNT(*) AS row_count
FROM booking
GROUP BY status
ORDER BY status;

COMMIT;