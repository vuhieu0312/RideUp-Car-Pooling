package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingResponse {
    String id;
    String bookingCode;
    String customerId;
    String customerName;
    String customerPhone;
    String tripId;
    String tripDeparture;
    String tripPlate;
    BookingStatus status;
    PaymentStatus paymentStatus;
    Integer seatCount;
    BigDecimal pricePerSeat;
    BigDecimal totalAmount;
    LocalDateTime reservedAt;
    LocalDateTime expiresAt;
    String pickupAddressText;
    Double pickupLat;
    Double pickupLng;
    String dropoffAddressText;
    Double dropoffLat;
    Double dropoffLng;
    String note;
    LocalDateTime cancelledAt;
    String cancelReason;
    LocalDateTime createdAt;
}