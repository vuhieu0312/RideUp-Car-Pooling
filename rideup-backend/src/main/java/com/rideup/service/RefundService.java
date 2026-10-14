package com.rideup.service;

import com.rideup.entity.Payment;
import com.rideup.enums.PaymentStatus;
import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.repository.PaymentRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Refund skeleton cho Phase B. */
@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RefundService {

    PaymentRepository paymentRepository;

    /** Hoàn tiền cho booking đã thanh toán (status PAID). */
    @Transactional
    public Payment refundPayment(String bookingId, String reason) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }

        // TODO Phase B: gọi Stripe Refund.create() với payment.transactionId
        // và insert record vào com.rideup.entity.Refund (đã có sẵn).

        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setFailureReason(reason);
        log.info("Payment {} → REFUNDED (skeleton, no Stripe call yet): {}",
            payment.getId(), reason);
        return paymentRepository.save(payment);
    }
}