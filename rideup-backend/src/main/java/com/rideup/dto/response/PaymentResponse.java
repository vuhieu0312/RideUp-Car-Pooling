package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.entity.Payment;
import com.rideup.enums.PaymentMethod;
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
public class PaymentResponse {
    String id;
    String bookingId;
    BigDecimal amount;
    PaymentMethod method;
    PaymentStatus status;
    String transactionId;
    LocalDateTime paidAt;
    String failureReason;
    LocalDateTime createdAt;

    public static PaymentResponse from(Payment p) {
        if (p == null) return null;
        return PaymentResponse.builder()
                .id(p.getId())
                .bookingId(p.getBooking() == null ? null : p.getBooking().getId())
                .amount(p.getAmount())
                .method(p.getMethod())
                .status(p.getStatus())
                .transactionId(p.getTransactionId())
                .paidAt(p.getPaidAt())
                .failureReason(p.getFailureReason())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
