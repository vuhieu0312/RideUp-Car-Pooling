package com.rideup.enums;

public enum BookingStatus {
    PENDING_PAYMENT,         // vừa tạo booking, chờ thanh toán thẻ
    WAITING_DRIVER_APPROVAL, // đã giữ tiền (holding stripe) hoặc chọn tiền mặt, chờ tài xế duyệt
    REJECTED_BY_DRIVER,      // tài xế từ chối booking
    CONFIRMED,               // tài xế đã duyệt booking
    COMPLETED,               // chuyến đã hoàn thành
    CANCELLED_BY_USER,          // khách hàng hủy chuyến
    CANCELLED_BY_DRIVER,        // tài xế hủy chuyến
    CANCELLED_PAYMENT_FAILED,// hủy do thanh toán thất bại
    EXPIRED                  // timeout hủy tự động (tài xế không duyệt)
}