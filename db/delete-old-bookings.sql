-- ============================================================
-- XÓA BOOKING CŨ (status không còn trong enum mới)
-- Status cũ bị xóa: PENDING, PICKED_UP, CANCELLED_USER
-- Enum hiện tại: PENDING_PAYMENT, WAITING_DRIVER_APPROVAL,
--   REJECTED_BY_DRIVER, CONFIRMED, COMPLETED, CANCELLED_BY_USER,
--   CANCELLED_BY_DRIVER, CANCELLED_PAYMENT_FAILED, EXPIRED
-- ============================================================
--
-- Lưu ý: Các bảng conversation/conversation_member/message có thể
-- KHÔNG tồn tại trong DB thực tế (chưa được tạo). Nếu gặp lỗi
-- "Table doesn't exist", comment các phần DELETE liên quan.
-- ============================================================

START TRANSACTION;

-- (1) Thống kê trước khi xóa
SELECT 'BEFORE DELETE' AS info;
SELECT status, COUNT(*) AS row_count
FROM booking
WHERE status IN ('PENDING', 'PICKED_UP', 'CANCELLED_USER')
GROUP BY status;

-- (2) DELETE refund (nếu bảng tồn tại)
DELETE FROM refund
WHERE payment_id IN (
    SELECT id FROM payment
    WHERE booking_id IN (
        SELECT id FROM booking
        WHERE status IN ('PENDING', 'PICKED_UP', 'CANCELLED_USER')
    )
);

-- (3) DELETE payment (FK → booking)
DELETE FROM payment
WHERE booking_id IN (
    SELECT id FROM booking
    WHERE status IN ('PENDING', 'PICKED_UP', 'CANCELLED_USER')
);

-- (4) DELETE booking
DELETE FROM booking
WHERE status IN ('PENDING', 'PICKED_UP', 'CANCELLED_USER');

-- (6) Verify sau khi xóa
SELECT 'AFTER DELETE' AS info;
SELECT status, COUNT(*) AS row_count
FROM booking
GROUP BY status
ORDER BY status;

COMMIT;