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
    String tripId;
    BookingStatus status;
    String paymentId;
    PaymentStatus paymentStatus;

    Integer seatCount;
    BigDecimal pricePerSeat;
    BigDecimal totalAmount;

    /**
     * Trả về cho mobile (STRIPE):
     * - STRIPE: chứa {@code client_secret} của PaymentIntent — mobile dùng cho {@code presentPaymentSheet}.
     * - CASH: null.
     *
     * <p>Tên field là {@code paymentUrl} cho giữ backward-compat, nhưng giá trị thực là
     * Stripe {@code client_secret} (KHÔNG phải URL hosted page như trước).</p>
     */
    String paymentUrl;

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
}
