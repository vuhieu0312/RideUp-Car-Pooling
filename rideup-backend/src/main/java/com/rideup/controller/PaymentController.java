package com.rideup.controller;

import com.rideup.entity.Payment;
import com.rideup.exception.ApiResponse;
import com.rideup.service.PaymentService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Tất cả endpoint liên quan payment — Stripe booking payment + (Phase B) driver deposit. */
@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentController {

    PaymentService paymentService;

    @GetMapping("/booking/{bookingId}")
    public ApiResponse<Payment> getPaymentByBookingId(@PathVariable String bookingId) {
        return ApiResponse.success("Payment retrieved successfully",
            paymentService.getPaymentByBookingId(bookingId));
    }

    /** Tạo Stripe PaymentIntent cho booking hiện có — mobile gọi khi user bấm "Thanh toán ngay". */
    @PostMapping("/create-intent")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Map<String, String>> createPaymentIntent(
            @RequestBody Map<String, String> request,
            Authentication auth) {
        String bookingId = request == null ? null : request.get("bookingId");
        if (bookingId == null || bookingId.isBlank()) {
            throw new com.rideup.exception.AppException(com.rideup.exception.ErrorCode.BOOKING_REQUEST_INVALID);
        }
        Map<String, String> result = paymentService.createPaymentIntentForBooking(
            bookingId, currentUserId(auth));
        return ApiResponse.success("PaymentIntent created", result);
    }

    /** Stripe webhook — verify signature bằng Stripe-Signature header + webhook secret. */
    @PostMapping("/webhook")
    public ApiResponse<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        paymentService.handleWebhookEvent(payload, sigHeader);
        return ApiResponse.success("Webhook processed", null);
    }

    /** Mobile-driven authorize — mobile gọi SAU khi presentPaymentSheet() trả paymentIntent success. */
    @PostMapping("/{id}/authorize")
    public ApiResponse<Payment> authorizePayment(
            @PathVariable("id") String paymentId,
            @RequestBody(required = false) Map<String, String> request) {
        String transactionId = request == null ? "" : request.getOrDefault("transactionId", "");
        return ApiResponse.success("Payment authorized successfully",
            paymentService.authorizePayment(paymentId, transactionId));
    }

    @PostMapping("/{id}/failed")
    public ApiResponse<Payment> markPaymentFailed(
            @PathVariable("id") String paymentId,
            @RequestBody(required = false) Map<String, String> request) {
        String reason = (request == null || request.get("reason") == null)
            ? "Payment failed"
            : request.get("reason");
        return ApiResponse.success("Payment marked as failed",
            paymentService.markPaymentFailed(paymentId, reason));
    }

    /** Driver gọi để tạo PaymentIntent cho việc trả nợ hoa hồng platform. */
    @PostMapping("/wallet/deposit")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<Payment> depositWallet(Authentication auth) {
        return ApiResponse.success("Deposit initialized", paymentService.depositWallet());
    }

    /**
     * Webhook Stripe confirm cho deposit — public (không cần JWT).
     */
    @PostMapping("/wallet/confirm")
    public ApiResponse<Void> confirmDeposit(@RequestParam("transactionId") String transactionId) {
        paymentService.confirmDeposit(transactionId);
        return ApiResponse.success("Deposit confirmed", null);
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}