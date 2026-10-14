-- Chạy trên DB rideup (MySQL). Đổi cột ENUM cũ sang VARCHAR để khớp enum Java mới (HOLDING, WAITING_DRIVER_APPROVAL, ...)
ALTER TABLE booking MODIFY COLUMN status         VARCHAR(30) NOT NULL;
ALTER TABLE booking MODIFY COLUMN payment_status VARCHAR(30) NOT NULL;
ALTER TABLE payment MODIFY COLUMN status         VARCHAR(30) NOT NULL;
ALTER TABLE payment MODIFY COLUMN method         VARCHAR(20) NOT NULL;
