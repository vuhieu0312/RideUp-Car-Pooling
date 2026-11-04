package com.rideup.service;

import com.rideup.constant.RedisKey;
import com.rideup.constant.RedisKeyTTL;
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
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.CompletableFuture;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentService {

    final PaymentRepository paymentRepository;
    final BookingRepository bookingRepository;
    final RedisTemplate<String, Object> redisTemplate;
    final RealtimeService realtimeService;
    final StripeConnectService stripeConnectService;
    final PlatformTransactionManager transactionManager;

    @Value("${stripe.currency-code:vnd}")
    String currencyCode;

    @Value("${stripe.webhook-secret:}")
    String webhookSecret;

    public boolean isStripeConfigured() {
        return Stripe.apiKey != null && !Stripe.apiKey.isBlank();
    }


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
            // idempotency key theo paymentId, client retry sẽ không tạo PI mới
            RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey("pi-create-" + payment.getId())
                .build();
            PaymentIntent intent = PaymentIntent.create(params, options);
            payment.setTransactionId(intent.getId());           // pi_xxx
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

    // payment phải thuộc booking của user này, không thì trả 404 để không lộ thông tin
    private Payment requireOwnPayment(String paymentId, String userId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        Booking booking = payment.getBooking();
        if (booking == null || booking.getCustomer() == null
            || !booking.getCustomer().getId().equals(userId)) {
            throw new AppException(ErrorCode.PAYMENT_NOT_FOUND);
        }
        return payment;
    }

    @Transactional
    public Payment authorizePayment(String paymentId, String transactionId, String userId) {
        requireOwnPayment(paymentId, userId);
        return authorizePayment(paymentId, transactionId);
    }

    @Transactional
    public Payment markPaymentFailed(String paymentId, String reason, String userId) {
        requireOwnPayment(paymentId, userId);
        return markPaymentFailed(paymentId, reason);
    }

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
            // PI phải đúng cái đã tạo cho payment này và đủ tiền
            boolean sameIntent = payment.getTransactionId() == null
                || payment.getTransactionId().equals(transactionId);
            boolean samePayment = paymentId.equals(intent.getMetadata().get("paymentId"));
            boolean sameAmount = payment.getAmount() != null
                && intent.getAmount() != null
                && intent.getAmount().longValue() == payment.getAmount().longValue();
            if (!sameIntent || !samePayment || !sameAmount) {
                log.warn("Từ chối authorize: PI={} không khớp payment={}", transactionId, paymentId);
                throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
            }
        } catch (StripeException e) {
            log.error("Error retrieving Stripe PaymentIntent {}: {}", transactionId, e.getMessage());
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }

        payment.setStatus(PaymentStatus.HOLDING);
        payment.setTransactionId(transactionId);
        payment.setFailureReason(null);
        payment = paymentRepository.save(payment);

        // đổi trạng thái booking luôn ở đây, giống webhook handleAmountCapturableUpdated
        Booking booking = payment.getBooking();
        if (booking != null && booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.WAITING_DRIVER_APPROVAL);
            bookingRepository.save(booking);
            realtimeService.bookingChanged(booking);
        }

        log.info("Payment {} authorized → HOLDING (PI={}); booking {} → WAITING_DRIVER_APPROVAL",
            paymentId, transactionId, booking != null ? booking.getId() : null);
        return payment;
    }

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
            // chuyển phần của tài xế sang Stripe Connect, lỗi thì chuyển bù khi tài xế mở màn Ví
            stripeConnectService.transferAfterCapture(payment);
        } catch (StripeException e) {
            log.error("Stripe capture failed for booking {}: {}", bookingId, e.getMessage());
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Capture failed: " + e.getMessage());
            paymentRepository.save(payment);
        }
    }

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

        // gọi Stripe mất vài giây nên chạy sau commit ở luồng riêng cho API trả nhanh
        String tid = payment.getTransactionId();
        if (tid != null && !tid.isBlank()) {
            cancelStripeAfterCommit(tid, bookingId);
        }
        payment.setStatus(PaymentStatus.VOIDED);
        paymentRepository.save(payment);
        log.info("Payment {} VOIDED for booking={}", payment.getId(), bookingId);
    }

    private void cancelStripeAfterCommit(String tid, String bookingId) {
        Runnable job = () -> CompletableFuture.runAsync(() -> cancelStripe(tid, bookingId));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    job.run();
                }
            });
        } else {
            job.run();
        }
    }

    private void cancelStripe(String tid, String bookingId) {
        try {
            if (tid.startsWith("cs_")) {
                Session session = Session.retrieve(tid);
                if ("open".equals(session.getStatus()) || "complete".equals(session.getStatus())) {
                    session.expire();
                }
            } else if (tid.startsWith("pi_")) {
                PaymentIntent intent = PaymentIntent.retrieve(tid);
                if (!"canceled".equals(intent.getStatus())) {
                    intent.cancel();
                }
            }
        } catch (StripeException e) {
            log.warn("Stripe cancel failed for booking {}: {}", bookingId, e.getMessage());
            markVoidFailed(bookingId, e.getMessage());
        }
    }

    private void markVoidFailed(String bookingId, String stripeError) {
        try {
            new TransactionTemplate(transactionManager).executeWithoutResult(tx ->
                paymentRepository.findByBookingId(bookingId).ifPresent(p -> {
                    if (p.getStatus() != PaymentStatus.VOIDED) return;
                    String reason = "Hủy giữ tiền Stripe thất bại: " + stripeError;
                    p.setStatus(PaymentStatus.VOID_FAILED);
                    p.setFailureReason(reason.length() > 500 ? reason.substring(0, 500) : reason);
                    paymentRepository.save(p);
                    realtimeService.bookingChanged(p.getBooking());
                }));
        } catch (RuntimeException ex) {
            log.error("Could not mark payment VOID_FAILED for booking {}: {}", bookingId, ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Payment getPaymentByBookingId(String bookingId, String userId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        boolean isCustomer = booking.getCustomer() != null && booking.getCustomer().getId().equals(userId);
        boolean isDriver = booking.getTrip() != null && booking.getTrip().getDriver() != null
            && booking.getTrip().getDriver().getId().equals(userId);
        if (!isCustomer && !isDriver) {
            throw new AppException(ErrorCode.PAYMENT_NOT_FOUND);
        }
        return paymentRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
    }


    @Transactional
    public Map<String, String> createPaymentIntentForBooking(String bookingId, String userId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        User customer = booking.getCustomer();
        if (customer == null || !customer.getId().equals(userId)) {
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND);  // 404 để không lộ thông tin
        }

        Payment payment = paymentRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getMethod() != PaymentMethod.STRIPE) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            // đã thanh toán/huỷ/hết hạn thì không tạo PI mới
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }

        if (!isStripeConfigured()) {
            throw new AppException(ErrorCode.STRIPE_NOT_CONFIGURED);
        }

        // PI đã tạo lúc đặt chỗ, client_secret không lưu DB nên lấy lại từ Stripe
        if (payment.getTransactionId() != null) {
            try {
                PaymentIntent existing = PaymentIntent.retrieve(payment.getTransactionId());
                log.info("createPaymentIntentForBooking: reuse existing PI={} for booking={} user={}",
                    existing.getId(), bookingId, userId);
                return Map.of("clientSecret", existing.getClientSecret());
            } catch (StripeException e) {
                log.error("Retrieve PI {} failed for booking {}: {}",
                    payment.getTransactionId(), bookingId, e.getMessage());
                throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
            }
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


    @Transactional
    public void handleWebhookEvent(String payload, String signatureHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("Webhook secret chưa config (STRIPE_WEBHOOK_SECRET). "
                + "Bỏ qua verify — chỉ dùng cho local dev.");
            // production nên throw, dev thì vẫn parse event dù không verify chữ ký
        }

        Event event;
        try {
            if (webhookSecret != null && !webhookSecret.isBlank()) {
                event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
            } else {
                // dev: parse không verify chữ ký (chỉ dùng với stripe listen local)
                event = Event.GSON.fromJson(payload, Event.class);
            }
        } catch (SignatureVerificationException e) {
            log.error("Webhook signature verification failed: {}", e.getMessage());
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        } catch (Exception e) {
            log.error("Webhook parse error: {}", e.getMessage());
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }

        // idempotency: đánh dấu event đã xử lý trong Redis (SET NX + TTL)
        String eventId = event.getId();
        String eventKey = RedisKey.STRIPE_EVENT + eventId;
        if (eventId != null) {
            Boolean first = redisTemplate.opsForValue()
                .setIfAbsent(eventKey, "1", RedisKeyTTL.STRIPE_EVENT_TTL);
            if (!Boolean.TRUE.equals(first)) {
                log.info("Webhook event {} already processed, skip (idempotent)", eventId);
                return;
            }
        }

        log.info("Webhook received: id={} type={}", eventId, event.getType());
        try {
            dispatchEvent(event);
        } catch (RuntimeException e) {
            // lỗi thì bỏ đánh dấu để Stripe gửi lại
            if (eventId != null) {
                redisTemplate.delete(eventKey);
            }
            throw e;
        }
    }

    private void dispatchEvent(Event event) {
        String type = event.getType();
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
            case "payment_intent.canceled":
                handlePaymentIntentCanceled(event);
                break;
            case "charge.expired":
                handleChargeExpired(event);
                break;
            default:
                log.debug("Unhandled webhook event type: {}", type);
        }
    }

    @Transactional
    protected void handleAmountCapturableUpdated(Event event) {
        PaymentIntent intent = (PaymentIntent) eventObject(event);
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
        paymentRepository.save(payment);

        Booking booking = payment.getBooking();
        if (booking != null && booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.WAITING_DRIVER_APPROVAL);
            bookingRepository.save(booking);
            realtimeService.bookingChanged(booking);
        }
        log.info("Webhook: payment {} → {} (booking waits for driver)",
            paymentId, PaymentStatus.HOLDING);
    }

    @Transactional
    protected void handlePaymentIntentSucceeded(Event event) {
        PaymentIntent intent = (PaymentIntent) eventObject(event);
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

        Booking booking = payment.getBooking();
        if (booking != null) {
            if (booking.getStatus() == BookingStatus.CONFIRMED) {
                booking.setStatus(BookingStatus.COMPLETED);
            }
            bookingRepository.save(booking);
            realtimeService.bookingChanged(booking);
        }
        log.info("Webhook: payment {} → PAID (booking {})", paymentId, booking.getId());
    }

    @Transactional
    protected void handlePaymentIntentFailed(Event event) {
        PaymentIntent intent = (PaymentIntent) eventObject(event);
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
            // giữ nguyên status booking, admin xử lý; chỉ báo app tải lại trạng thái thanh toán
            realtimeService.bookingChanged(booking);
        }
        log.info("Webhook: payment {} → FAILED ({})", paymentId, reason);
    }

    protected void handlePaymentIntentCanceled(Event event) {
        PaymentIntent intent = (PaymentIntent) eventObject(event);
        String paymentId = intent.getMetadata() != null ? intent.getMetadata().get("paymentId") : null;
        Payment payment = paymentId != null
            ? paymentRepository.findById(paymentId).orElse(null)
            : paymentRepository.findByTransactionId(intent.getId()).orElse(null);
        markVoidedByStripe(payment, "payment_intent.canceled");
    }

    protected void handleChargeExpired(Event event) {
        if (!(eventObject(event) instanceof Charge charge) || charge.getPaymentIntent() == null) {
            log.warn("Webhook charge.expired missing payment_intent");
            return;
        }
        Payment payment = paymentRepository.findByTransactionId(charge.getPaymentIntent()).orElse(null);
        markVoidedByStripe(payment, "charge.expired");
    }

    private StripeObject eventObject(Event event) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        return deserializer.getObject().orElseGet(() -> {
            try {
                return deserializer.deserializeUnsafe();
            } catch (EventDataObjectDeserializationException e) {
                throw new IllegalStateException("Cannot deserialize Stripe event " + event.getId(), e);
            }
        });
    }

    private void markVoidedByStripe(Payment payment, String source) {
        if (payment == null) return;
        PaymentStatus current = payment.getStatus();
        if (current != PaymentStatus.HOLDING
            && current != PaymentStatus.PENDING
            && current != PaymentStatus.VOID_FAILED) {
            log.debug("Payment {} status={}, skip {}", payment.getId(), current, source);
            return;
        }
        payment.setStatus(PaymentStatus.VOIDED);
        paymentRepository.save(payment);

        Booking booking = payment.getBooking();
        if (booking != null) {
            realtimeService.bookingChanged(booking);
        }
        log.info("Webhook {}: payment {} {} → {}", source, payment.getId(), current, PaymentStatus.VOIDED);
    }

    // Phase B, chưa làm

    public Payment depositWallet() {
        throw new AppException(ErrorCode.DEPOSIT_NOT_ALLOWED);
    }

    public void confirmDeposit(String transactionId) {
        throw new AppException(ErrorCode.DEPOSIT_NOT_ALLOWED);
    }
}