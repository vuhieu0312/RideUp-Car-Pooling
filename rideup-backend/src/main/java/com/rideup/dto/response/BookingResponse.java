package com.rideup.dto.response;

import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import com.rideup.enums.TripStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingResponse {
    String id;
    String bookingCode;
    String customerId;
    String tripId;
    BookingStatus status;
    String paymentId;
    PaymentStatus paymentStatus;
    PaymentMethod paymentMethod;
    String paymentUrl;
    Integer seatCount;
    BigDecimal pricePerSeat;
    BigDecimal totalAmount;
    Double pickupLat;
    Double pickupLng;
    String pickupWardId;
    String pickupAddressText;
    Double dropoffLat;
    Double dropoffLng;
    String dropoffWardId;
    String dropoffAddressText;
    String userAvatar;
    String userName;
    String note;
    LocalDateTime reservedAt;
    LocalDateTime expiresAt;
    LocalDateTime cancelledAt;
    String cancelReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    // Thông tin chuyến để màn "Chuyến xe của tôi" hiển thị và xem chi tiết
    LocalDateTime tripDeparture;
    TripStatus tripStatus;
    String tripStartProvince;
    String tripEndProvince;
    String pickupWardName;
    String dropoffWardName;
    String driverName;
    /** Chỉ có khi booking đã được tài xế xác nhận. */
    String driverPhone;
    String tripPlate;
    String tripVehicle;
}
