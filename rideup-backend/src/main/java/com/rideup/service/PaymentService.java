package com.rideup.service;

import com.rideup.entity.Booking;
import com.rideup.entity.Payment;
import com.rideup.entity.User;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.PaymentRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Nghiệp vụ thanh toán Stripe cho booking fare (Phase A). */
@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentService {

    final PaymentRepository paymentRepository;
    final BookingRepository bookingRepository;

    @Value("${stripe.currency-code:vnd}")
    String currencyCode;

    @Value("${stripe.success-url:rideupcustomer://payment-success}")
    String successUrl;

    @Value("${stripe.cancel-url:rideupcustomer://payment-cancel}")
    String cancelUrl;

    /** Webhook signing secret — set qua env STRIPE_WEBHOOK_SECRET (whsec_...). */
    @Value("${stripe.webhook-secret:}")
    String webhookSecret;

    /** Idempotency cache cho webhook events — tránh xử lý trùng khi Stripe retry. */
    private final Set<String> processedWebhookEvents = ConcurrentHashMap.newKeySet();

    public boolean isStripeConfigured() {
        return Stripe.apiKey != null && !Stripe.apiKey.isBlank();
    }

    // Booking payment

    /** Tạo Stripe PaymentIntent (manual capture) cho booking fare. */
    @Transactional
    public void createPaymentIntent(Payment payment, Booking booking) {
        log.info("[DEBUG] createPaymentIntent called for booking={} method={} stripeConfigured={}",
            booking.getId(), payment.getMethod(), isStripeConfigured());
        if (!isStripeConfigured()) {
            log.error("[DEBUG] Stripe NOT configured → throwing STRIPE_NOT_CONFIGURED");
            throw new AppException(ErrorCode.STRIPE_NOT_CONFIGURED);
        }
        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(payment.getAmount().longValue())
                .setCurrency(currencyCode.toLowerCase())
                .setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.MANUAL)
                .setDescription("RideUp booking " + booking.getBookingCode())
                .putMetadata("bookingId", booking.getId())
                .putMetadata("paymentId", payment.getId())
                .putMetadata("bookingCode", booking.getBookingCode())
                .putMetadata("customerId", booking.getCustomer().getId())
                .build();
            // Idempotency key dựa trên paymentId — nếu client retry sẽ KHÔNG tạo PI mới
            RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey("pi-create-" + payment.getId())
                .build();
            PaymentIntent intent = PaymentIntent.create(params, options);
            payment.setTransactionId(intent.getId());           // pi_xxx
            payment.setPaymentUrl(intent.getClientSecret());     // dùng cho PaymentSheet/WebView
            payment.setCorrelationId(booking.getBookingCode());
            paymentRepository.save(payment);
            log.info("[DEBUG] Created Stripe PI={} for booking={} clientSecret prefix={}",
                intent.getId(), booking.getId(),
                intent.getClientSecret() != null ? intent.getClientSecret().substring(0, 12) + "..." : "NULL");
        } catch (StripeException e) {
            log.error("[DEBUG] Stripe createPaymentIntent failed for booking {}: {}",
                booking.getId(), e.getMessage());
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }
    }

    /** Mobile-driven authorize — mobile gọi SAU khi presentPaymentSheet() trả paymentIntent success. */
    @Transactional
    public Payment authorizePayment(String paymentId, String transactionId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus() == PaymentStatus.HOLDING
            || payment.getStatus() == PaymentStatus.PAID) {
            log.info("authorizePayment idempotent noop for payment={} status={}",
                paymentId, payment.getStatus());
            return payment;
        }
        if (payment.getStatus() == PaymentStatus.FAILED
            || payment.getStatus() == PaymentStatus.VOIDED
            || payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }
        if (payment.getMethod() != PaymentMethod.STRIPE) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }
        if (transactionId == null || transactionId.isBlank()) {
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }

        try {
            PaymentIntent intent = PaymentIntent.retrieve(transactionId);
            if (!"requires_capture".equals(intent.getStatus())) {
                log.error("Stripe PI not requires_capture. paymentId={} piId={} piStatus={}",
                    paymentId, transactionId, intent.getStatus());
                throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
            }
        } catch (StripeException e) {
            log.error("Error retrieving Stripe PaymentIntent {}: {}", transactionId, e.getMessage());
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }

        payment.setStatus(PaymentStatus.HOLDING);
        payment.setTransactionId(transactionId);
        payment.setFailureReason(null);
        payment = paymentRepository.save(payment);

        // Flip Booking NGAY ở đây, giống hệt handleAmountCapturableUpdated() (webhook).
        Booking booking = payment.getBooking();
        if (booking != null && booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.WAITING_DRIVER_APPROVAL);
            booking.setPaymentStatus(PaymentStatus.HOLDING);
            bookingRepository.save(booking);
        }

        log.info("Payment {} authorized → HOLDING (PI={}); booking {} → WAITING_DRIVER_APPROVAL",
            paymentId, transactionId, booking != null ? booking.getId() : null);
        return payment;
    }

    /** Mark payment FAILED — gọi từ webhook payment_intent.payment_failed hoặc admin. */
    @Transactional
    public Payment markPaymentFailed(String paymentId, String reason) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }
        if (payment.getStatus() == PaymentStatus.FAILED) {
            return payment;
        }

        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(reason);
        payment.setPaidAt(null);
        log.info("Payment {} marked FAILED: {}", paymentId, reason);
        return paymentRepository.save(payment);
    }

    /** Capture Stripe PaymentIntent (manual → automatic) sau khi trip hoàn thành. */
    @Transactional
    public void capturePayment(String bookingId) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getMethod() != PaymentMethod.STRIPE || payment.getStatus() != PaymentStatus.HOLDING) {
            log.debug("capturePayment noop for booking={} method={} status={}",
                bookingId, payment.getMethod(), payment.getStatus());
            return;
        }

        try {
            PaymentIntent intent = PaymentIntent.retrieve(payment.getTransactionId());
            intent.capture();
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);
            log.info("Payment {} captured → PAID for booking={}", payment.getId(), bookingId);
        } catch (StripeException e) {
            log.error("Stripe capture failed for booking {}: {}", bookingId, e.getMessage());
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Capture failed: " + e.getMessage());
            paymentRepository.save(payment);
        }
    }

    /** Cancel Stripe PaymentIntent — gọi khi driver reject / customer cancel / scheduler expire. */
    @Transactional
    public void cancelPayment(String bookingId) {
        Payment payment = paymentRepository.findByBookingId(bookingId).orElse(null);
        if (payment == null) return;

        if (payment.getMethod() == PaymentMethod.CASH) {
            if (payment.getStatus() != PaymentStatus.VOIDED) {
                payment.setStatus(PaymentStatus.VOIDED);
                paymentRepository.save(payment);
            }
            return;
        }

        if (payment.getStatus() != PaymentStatus.HOLDING
            && payment.getStatus() != PaymentStatus.PENDING) {
            return;
        }

        String tid = payment.getTransactionId();
        if (tid != null && !tid.isBlank()) {
            try {
                if (tid.startsWith("cs_")) {
                    Session session = Session.retrieve(tid);
                    if ("open".equals(session.getStatus()) || "complete".equals(session.getStatus())) {
                        session.expire();
                    }
                } else if (tid.startsWith("pi_")) {
                    PaymentIntent intent = PaymentIntent.retrieve(tid);
                    intent.cancel();
                }
            } catch (StripeException e) {
                log.warn("Stripe cancel failed for booking {} (will still mark local VOIDED): {}",
                    bookingId, e.getMessage());
            }
        }
        payment.setStatus(PaymentStatus.VOIDED);
        paymentRepository.save(payment);
        log.info("Payment {} VOIDED for booking={}", payment.getId(), bookingId);
    }

    /**
     * Lookup payment theo booking id — dùng cho GET /payments/booking/{bookingId}.
     */
    @Transactional(readOnly = true)
    public Payment getPaymentByBookingId(String bookingId) {
        return paymentRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
    }

    // Create PaymentIntent on demand (mobile gọi khi user bấm "Thanh toán ngay")

    /** Tạo Stripe PaymentIntent cho booking đã tồn tại. */
    @Transactional
    public Map<String, String> createPaymentIntentForBooking(String bookingId, String userId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        User customer = booking.getCustomer();
        if (customer == null || !customer.getId().equals(userId)) {
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND);  // join return 404 để không lộ thông tin
        }

        Payment payment = paymentRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getMethod() != PaymentMethod.STRIPE) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            // Đã thanh toán / huỷ / expire → không cho phép tạo PI mới
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }

        if (!isStripeConfigured()) {
            throw new AppException(ErrorCode.STRIPE_NOT_CONFIGURED);
        }

        // Payment đã được tạo PaymentIntent sẵn tại thời điểm tạo booking (xem BookingService#createBookingInternal → PaymentService#createPaymentIntent).
        if (payment.getTransactionId() != null && payment.getPaymentUrl() != null) {
            log.info("createPaymentIntentForBooking: reuse existing PI={} for booking={} user={}",
                payment.getTransactionId(), bookingId, userId);
            return Map.of("clientSecret", payment.getPaymentUrl());
        }

        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(payment.getAmount().longValue())
                .setCurrency(currencyCode.toLowerCase())
                .setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.MANUAL)
                .setAutomaticPaymentMethods(
                    PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                        .setEnabled(true)
                        .build())
                .setDescription("RideUp booking " + booking.getBookingCode())
                .putMetadata("bookingId", booking.getId())
                .putMetadata("paymentId", payment.getId())
                .putMetadata("bookingCode", booking.getBookingCode())
                .putMetadata("userId", userId)
                .build();

            RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey("pi-create-" + payment.getId())
                .build();

            PaymentIntent intent = PaymentIntent.create(params, options);
            payment.setTransactionId(intent.getId());
            payment.setPaymentUrl(intent.getClientSecret());
            payment.setCorrelationId(booking.getBookingCode());
            paymentRepository.save(payment);

            log.info("createPaymentIntentForBooking: PI={} for booking={} user={}",
                intent.getId(), bookingId, userId);

            return Map.of("clientSecret", intent.getClientSecret());
        } catch (StripeException e) {
            log.error("createPaymentIntentForBooking failed for booking {}: {}",
                bookingId, e.getMessage());
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }
    }

    // Stripe webhook handler

    /** Xử lý Stripe webhook event. */
    public void handleWebhookEvent(String payload, String signatureHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("Webhook secret chưa config (STRIPE_WEBHOOK_SECRET). "
                + "Bỏ qua verify — chỉ dùng cho local dev.");
            // Trong production nên throw. Để dev pass-through, ta vẫn parse event nhưng không verify signature.
        }

        Event event;
        try {
            if (webhookSecret != null && !webhookSecret.isBlank()) {
                event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
            } else {
                // Dev fallback: parse không đọc signature (chỉ dùng với stripe listen local)
                event = Event.GSON.fromJson(payload, Event.class);
            }
        } catch (SignatureVerificationException e) {
            log.error("Webhook signature verification failed: {}", e.getMessage());
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        } catch (Exception e) {
            log.error("Webhook parse error: {}", e.getMessage());
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }

        // Idempotency check
        String eventId = event.getId();
        if (eventId != null && !processedWebhookEvents.add(eventId)) {
            log.info("Webhook event {} already processed, skip (idempotent)", eventId);
            return;
        }

        String type = event.getType();
        log.info("Webhook received: id={} type={}", eventId, type);

        switch (type) {
            case "payment_intent.amount_capturable_updated":
                handleAmountCapturableUpdated(event);
                break;
            case "payment_intent.succeeded":
                handlePaymentIntentSucceeded(event);
                break;
            case "payment_intent.payment_failed":
                handlePaymentIntentFailed(event);
                break;
            default:
                log.debug("Unhandled webhook event type: {}", type);
        }
    }

    @Transactional
    protected void handleAmountCapturableUpdated(Event event) {
        PaymentIntent intent = (PaymentIntent) event.getData().getObject();
        String paymentId = intent.getMetadata().get("paymentId");
        if (paymentId == null) {
            log.warn("Webhook amount_capturable_updated missing paymentId metadata");
            return;
        }
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) return;
        if (payment.getStatus() != PaymentStatus.PENDING) {
            log.debug("Payment {} not PENDING, skip (status={})", paymentId, payment.getStatus());
            return;
        }
        payment.setStatus(PaymentStatus.HOLDING);
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        // Booking flip sang WAITING_DRIVER_APPROVAL
        Booking booking = payment.getBooking();
        if (booking != null && booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.WAITING_DRIVER_APPROVAL);
            booking.setPaymentStatus(PaymentStatus.HOLDING);
            bookingRepository.save(booking);
        }
        log.info("Webhook: payment {} → {} (booking waits for driver)",
            paymentId, PaymentStatus.HOLDING);
    }

    @Transactional
    protected void handlePaymentIntentSucceeded(Event event) {
        PaymentIntent intent = (PaymentIntent) event.getData().getObject();
        String paymentId = intent.getMetadata().get("paymentId");
        if (paymentId == null) {
            log.warn("Webhook succeeded missing paymentId metadata");
            return;
        }
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) return;
        if (payment.getStatus() == PaymentStatus.PAID) {
            log.debug("Payment {} already PAID, skip", paymentId);
            return;
        }
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        // Booking flip sang COMPLETED
        Booking booking = payment.getBooking();
        if (booking != null) {
            booking.setPaymentStatus(PaymentStatus.PAID);
            if (booking.getStatus() == BookingStatus.CONFIRMED) {
                booking.setStatus(BookingStatus.COMPLETED);
            }
            bookingRepository.save(booking);
        }
        log.info("Webhook: payment {} → PAID (booking {})", paymentId, booking.getId());
    }

    @Transactional
    protected void handlePaymentIntentFailed(Event event) {
        PaymentIntent intent = (PaymentIntent) event.getData().getObject();
        String paymentId = intent.getMetadata().get("paymentId");
        if (paymentId == null) {
            log.warn("Webhook payment_failed missing paymentId metadata");
            return;
        }
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) return;
        if (payment.getStatus() == PaymentStatus.PAID || payment.getStatus() == PaymentStatus.VOIDED) {
            log.debug("Payment {} already terminal ({}), skip failure", paymentId, payment.getStatus());
            return;
        }
        String reason = intent.getLastPaymentError() != null
            ? intent.getLastPaymentError().getMessage()
            : "Payment failed";
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(reason);
        paymentRepository.save(payment);

        Booking booking = payment.getBooking();
        if (booking != null) {
            booking.setPaymentStatus(PaymentStatus.FAILED);
            // Booking giữ nguyên status — admin xử lý refund/retry
        }
        log.info("Webhook: payment {} → FAILED ({})", paymentId, reason);
    }

    // Wallet/Deposit — Phase B shell (cần DriverProfile.systemDebt)

    public Payment depositWallet() {
        throw new AppException(ErrorCode.DEPOSIT_NOT_ALLOWED);
    }

    public void confirmDeposit(String transactionId) {
        throw new AppException(ErrorCode.DEPOSIT_NOT_ALLOWED);
    }
}