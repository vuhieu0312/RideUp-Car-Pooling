-- Fix: booking CASH bị kẹt ở PENDING_PAYMENT (bug cũ: createBooking luôn set PENDING_PAYMENT,
-- nên booking tiền mặt không bao giờ hiện ở tab "Chờ duyệt" của tài xế và bị scheduler EXPIRE sau 15 phút).
-- Backend mới đã cho CASH vào thẳng WAITING_DRIVER_APPROVAL. Chạy 1 lần để chuyển các booking CASH đang kẹt.
-- (Booking đã bị EXPIRED thì để nguyên — khách đặt lại.)

USE rideup;

-- Xem trước
SELECT b.booking_code, b.status, p.method, b.created_at
FROM booking b JOIN payment p ON p.booking_id = b.id
WHERE b.status = 'PENDING_PAYMENT' AND p.method = 'CASH';

UPDATE booking b JOIN payment p ON p.booking_id = b.id
SET b.status = 'WAITING_DRIVER_APPROVAL'
WHERE b.status = 'PENDING_PAYMENT' AND p.method = 'CASH';
