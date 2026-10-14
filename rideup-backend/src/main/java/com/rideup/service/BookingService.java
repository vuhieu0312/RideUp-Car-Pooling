package com.rideup.service;

import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.dto.request.CreateBookingRequest;
import com.rideup.dto.response.BookingResponse;
import com.rideup.entity.Booking;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Payment;
import com.rideup.entity.Trip;
import com.rideup.entity.User;
import com.rideup.entity.Ward;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import com.rideup.enums.TripStatus;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.PaymentRepository;
import com.rideup.repository.TripRepository;
import com.rideup.repository.UserRepository;
import com.rideup.repository.WardRepository;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
/** Nghiệp vụ đặt vé và xác nhận vé (UC24 + UC28). */
public class BookingService {

    final BookingRepository bookingRepository;
    final TripRepository tripRepository;
    final TripService tripService;
    final UserRepository userRepository;
    final DriverProfileRepository driverProfileRepository;
    final WardRepository wardRepository;
    final PaymentRepository paymentRepository;
    final PaymentService paymentService;

    /** Booking PENDING_PAYMENT quá expiresAt sẽ bị scheduler huỷ. */
    @Value("${app.booking.pending-expiration-minutes:15}")
    long pendingMinutes;

    /** Booking WAITING_DRIVER_APPROVAL quá waitingApprovalHours sẽ bị scheduler huỷ (cancel Stripe PI → release tiền về customer). */
    @Value("${app.booking.waiting-approval-expiration-hours:24}")
    long waitingApprovalHours;

    public BookingService(BookingRepository bookingRepository,
                          TripRepository tripRepository,
                          TripService tripService,
                          UserRepository userRepository,
                          DriverProfileRepository driverProfileRepository,
                          WardRepository wardRepository,
                          PaymentRepository paymentRepository,
                          PaymentService paymentService) {
        this.bookingRepository = bookingRepository;
        this.tripRepository = tripRepository;
        this.tripService = tripService;
        this.userRepository = userRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.wardRepository = wardRepository;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
    }

    /** Số lần retry tối đa khi gặp optimistic lock conflict. */
    private static final int MAX_RETRY = 3;

    /** Khách đặt chỗ. */
    public BookingResponse createBooking(String userId, CreateBookingRequest req) {
        ObjectOptimisticLockingFailureException lastEx = null;
        for (int attempt = 1; attempt <= MAX_RETRY; attempt++) {
            try {
                return createBookingInternal(userId, req);
            } catch (ObjectOptimisticLockingFailureException ex) {
                lastEx = ex;
                log.warn("Optimistic lock conflict on booking attempt={}/{} user={} trip={}",
                    attempt, MAX_RETRY, userId, req.getTripId());
                if (attempt < MAX_RETRY) {
                    // Jitter 10..40ms để 2 customer không retry cùng tick
                    try {
                        Thread.sleep(10 + ThreadLocalRandom.current().nextInt(30));
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw AppException.conflict("Đặt chỗ bị gián đoạn, vui lòng thử lại");
                    }
                }
            }
        }
        // Hết retry — trip quá hot, customer nên thử lại sau
        log.error("Optimistic lock retries exhausted for user={} trip={}",
            userId, req.getTripId(), lastEx);
        throw AppException.conflict(
            "Chuyến đang được nhiều người đặt cùng lúc, vui lòng thử lại sau");
    }

    /** Logic chính đặt vé — chạy trong 1 transaction riêng (REQUIRES_NEW) để mỗi lần retry được rollback sạch và đọc state mới từ DB. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public BookingResponse createBookingInternal(String userId, CreateBookingRequest req) {
        User customer = userRepository.findById(userId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy khách hàng"));

        Trip trip = tripRepository.findById(req.getTripId())
            .orElseThrow(() -> AppException.notFound("Không tìm thấy chuyến"));

        // Trip chỉ nhận đặt khi OPEN hoặc FULL (FULL vẫn có thể đặt nếu sau
        // đó có người huỷ — releaseSeat sẽ chuyển về OPEN).
        if (trip.getStatus() != TripStatus.OPEN && trip.getStatus() != TripStatus.FULL) {
            throw AppException.badRequest("Chuyến không nhận đặt chỗ");
        }

        // Chuyến đã quá giờ khởi hành thì không cho đặt
        if (trip.getDepartureTime() != null && trip.getDepartureTime().isBefore(LocalDateTime.now(TripService.VN_ZONE))) {
            throw new AppException(ErrorCode.BOOKING_TRIP_DEPARTED);
        }

        if (trip.getDriver().getId().equals(userId)) {
            throw AppException.badRequest("Không thể đặt chuyến của chính mình");
        }

        int seats = req.getSeatCount() == null ? 1 : req.getSeatCount();

        // (1) Check duplicate booking TRƯỚC
        Set<BookingStatus> activeStatuses = EnumSet.of(
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.WAITING_DRIVER_APPROVAL,
            BookingStatus.CONFIRMED);
        if (bookingRepository.existsByCustomerIdAndTripIdAndStatusIn(
                userId, trip.getId(), List.copyOf(activeStatuses))) {
            throw AppException.conflict("Bạn đã có booking đang chờ hoặc đã xác nhận cho chuyến này");
        }

        // (2) KHÔNG reserve ghế ngay khi customer book — ghế chỉ bị trừ khi driver confirm (xem #confirm).

        // Validate ghế còn đủ KHÔNG (read-only check — không trừ)
        if (trip.getSeatAvailable() < seats) {
            throw AppException.conflict("Chuyến chỉ còn " + trip.getSeatAvailable() + " ghế");
        }

        // (3) Save booking — nếu vi phạm unique constraint (customer_id,
        // trip_id, status) thì throw ngay, không retry.
        BigDecimal pricePerSeat = trip.getPriceVnd();
        BigDecimal total = pricePerSeat.multiply(BigDecimal.valueOf(seats));

        // Resolve ward cho điểm đón / điểm trả (optional nhưng nếu client gửi
        // wardId thì bắt buộc tồn tại và phải thuộc đúng tỉnh của trip).
        Ward pickupWard = resolveWard(req.getPickupWardId(), trip.getStartProvince() != null ? trip.getStartProvince().getId() : null, "đón");
        Ward dropoffWard = resolveWard(req.getDropoffWardId(), trip.getEndProvince() != null ? trip.getEndProvince().getId() : null, "trả");

        Booking booking = Booking.builder()
            .bookingCode("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .customer(customer)
            .trip(trip)
            .status(BookingStatus.PENDING_PAYMENT)
            .paymentStatus(PaymentStatus.PENDING)
            .seatCount(seats)
            .pricePerSeat(pricePerSeat)
            .totalAmount(total)
            .reservedAt(LocalDateTime.now())
            .expiresAt(LocalDateTime.now().plusMinutes(pendingMinutes))
            .pickupWard(pickupWard)
            .pickupAddressText(req.getPickupAddressText())
            .pickupLat(req.getPickupLat())
            .pickupLng(req.getPickupLng())
            .dropoffWard(dropoffWard)
            .dropoffAddressText(req.getDropoffAddressText())
            .dropoffLat(req.getDropoffLat())
            .dropoffLng(req.getDropoffLng())
            .note(req.getNote())
            .build();

        try {
            booking = bookingRepository.saveAndFlush(booking);
        } catch (DataIntegrityViolationException ex) {
            log.warn("DataIntegrityViolation on booking save trip={} user={}: {}",
                trip.getId(), userId, ex.getMostSpecificCause().getMessage());
            throw AppException.conflict("Không thể tạo booking (ràng buộc dữ liệu)");
        }

        // Tạo Payment gắn với booking (1-1).
        Payment payment = Payment.builder()
            .booking(booking)
            .correlationId(booking.getBookingCode())
            .amount(total)
            .method(req.getPaymentMethod())
            .status(PaymentStatus.PENDING)
            .build();
        payment = paymentRepository.saveAndFlush(payment);

        // Booking.payment là phía inverse (@OneToOne mappedBy="booking") — JPA KHÔNG tự đồng bộ 2 chiều trong bộ nhớ, chỉ đúng ở FK dưới DB.
        booking.setPayment(payment);

        // STRIPE: tạo PaymentIntent MANUAL capture sau khi đã save Payment row
        if (req.getPaymentMethod() == com.rideup.enums.PaymentMethod.STRIPE) {
            paymentService.createPaymentIntent(payment, booking);
        }

        log.info("Booking created id={} code={} trip={} seats={} amount={} paymentMethod={} paymentId={}",
            booking.getId(), booking.getBookingCode(),
            trip.getId(), seats, total, req.getPaymentMethod(), payment.getId());
        return toResponse(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> listMyBookings(String userId) {
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(userId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> listMyTripBookings(String userId, BookingStatus status) {
        DriverProfile driver = driverProfileRepository.findByUserId(userId)
            .orElseThrow(() -> AppException.notFound("Chưa có hồ sơ tài xế"));
        List<Booking> bookings = (status == null)
            ? bookingRepository.findAllByDriverId(driver.getUser().getId())
            : bookingRepository.findByDriverIdAndStatusIn(
                driver.getUser().getId(), List.of(status));
        return bookings.stream().map(this::toResponse).toList();
    }

    @Transactional
    public BookingResponse confirm(String bookingId, String driverUserId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy booking"));
        ensureDriverOwnsTrip(booking, driverUserId);

        if (booking.getStatus() != BookingStatus.WAITING_DRIVER_APPROVAL) {
            throw AppException.badRequest("Booking không ở trạng thái chờ duyệt");
        }

        // Validate trip còn OPEN/FULL — không cho duyệt khi xe đã khởi hành
        Trip trip = booking.getTrip();
        if (trip.getStatus() != TripStatus.OPEN && trip.getStatus() != TripStatus.FULL) {
            throw AppException.badRequest("Chuyến đã bắt đầu hoặc kết thúc, không thể duyệt");
        }

        // Trừ ghế tại đây khi driver duyệt (PESSIMISTIC_WRITE trong TripService.reserveSeat)
        tripService.reserveSeat(trip.getId(),
            booking.getSeatCount() == null ? 1 : booking.getSeatCount());

        booking.setStatus(BookingStatus.CONFIRMED);
        booking = bookingRepository.save(booking);
        log.info("Driver {} confirmed booking {}", driverUserId, bookingId);
        return toResponse(booking);
    }

    @Transactional
    public BookingResponse reject(String bookingId, String driverUserId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy booking"));
        ensureDriverOwnsTrip(booking, driverUserId);

        if (booking.getStatus() != BookingStatus.WAITING_DRIVER_APPROVAL) {
            throw AppException.badRequest("Booking không ở trạng thái chờ duyệt");
        }

        // Validate trip còn OPEN/FULL — không cho reject khi xe đã khởi hành
        Trip trip = booking.getTrip();
        if (trip.getStatus() != TripStatus.OPEN && trip.getStatus() != TripStatus.FULL) {
            throw AppException.badRequest("Chuyến đã bắt đầu hoặc kết thúc, không thể từ chối");
        }

        booking.setStatus(BookingStatus.REJECTED_BY_DRIVER);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason("Tài xế từ chối: " + reason);
        booking = bookingRepository.save(booking);

        // Huỷ Stripe hold nếu customer đã trả → tiền tự động refund về customer
        paymentService.cancelPayment(bookingId);

        // KHÔNG release ghế — booking WAITING_DRIVER_APPROVAL chưa được driver duyệt
        // nên ghế chưa từng bị trừ (xem {@link #createBookingInternal} + {@link #confirm}).

        log.info("Driver {} rejected booking {} reason={}", driverUserId, bookingId, reason);
        return toResponse(booking);
    }

    @Transactional
    public BookingResponse cancelByCustomer(String bookingId, String userId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy booking"));
        if (!booking.getCustomer().getId().equals(userId)) {
            throw AppException.forbidden("Bạn không có quyền huỷ booking này");
        }
        BookingStatus prevBookingStatus = booking.getStatus();
        if (prevBookingStatus == BookingStatus.COMPLETED
            || prevBookingStatus == BookingStatus.CANCELLED_BY_USER
            || prevBookingStatus == BookingStatus.CANCELLED_BY_DRIVER) {
            throw AppException.badRequest("Booking không thể huỷ");
        }

        booking.setStatus(BookingStatus.CANCELLED_BY_USER);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(reason);
        booking = bookingRepository.save(booking);

        // Huỷ Stripe hold nếu đang giữ tiền (release tiền về customer)
        paymentService.cancelPayment(bookingId);

        // Release ghế về trip nếu booking trước đó = CONFIRMED (driver đã duyệt
        // → ghế đã reserve). PENDING_PAYMENT/WAITING_DRIVER_APPROVAL → chưa từng reserve.
        if (prevBookingStatus == BookingStatus.CONFIRMED) {
            tripService.releaseSeat(booking.getTrip().getId(),
                booking.getSeatCount() == null ? 1 : booking.getSeatCount());
        }

        log.info("Customer {} cancelled booking {} (prevStatus={})", userId, bookingId, prevBookingStatus);
        return toResponse(booking);
    }

    /** Driver xác nhận đã nhận tiền mặt từ customer. */
    @Transactional
    public BookingResponse confirmCashPayment(String bookingId, String driverUserId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy booking"));
        ensureDriverOwnsTrip(booking, driverUserId);

        if (booking.getPayment() == null) {
            throw AppException.notFound("Booking chưa có payment");
        }
        Payment payment = booking.getPayment();
        if (payment.getMethod() != PaymentMethod.CASH) {
            throw AppException.badRequest("Booking này không phải CASH");
        }
        if (payment.getStatus() == PaymentStatus.PAID) {
            log.info("confirmCashPayment idempotent noop for booking={} (already PAID)", bookingId);
            return toResponse(booking);
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw AppException.badRequest("Payment không ở trạng thái chờ (status="
                + payment.getStatus() + ")");
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);
        booking.setPaymentStatus(PaymentStatus.PAID);
        bookingRepository.save(booking);

        log.info("Driver {} confirmed cash payment for booking {}", driverUserId, bookingId);
        return toResponse(booking);
    }

    /** Tick mỗi 60s (configurable). */
    @Scheduled(fixedDelayString = "${app.booking.expiration-check-ms:60000}")
    public void expirePendingBookings() {
        List<Booking> expired = bookingRepository
            .findByStatusAndExpiresAtBefore(BookingStatus.PENDING_PAYMENT, LocalDateTime.now());
        if (expired.isEmpty()) return;

        log.info("Scheduler: {} booking(s) PENDING_PAYMENT past expiresAt", expired.size());
        for (Booking booking : expired) {
            try {
                expireOneBooking(booking.getId());
            } catch (Exception ex) {
                log.error("Failed to expire booking {}: {}", booking.getId(), ex.getMessage(), ex);
            }
        }
    }

    /** Tick mỗi 60s. */
    @Scheduled(fixedDelayString = "${app.booking.expiration-check-ms:60000}")
    public void expireWaitingApprovalBookings() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(waitingApprovalHours);
        List<Booking> expired = bookingRepository
            .findByStatusAndExpiresAtBefore(BookingStatus.WAITING_DRIVER_APPROVAL, cutoff);
        if (expired.isEmpty()) return;

        log.info("Scheduler: {} booking(s) WAITING_DRIVER_APPROVAL older than {}h",
            expired.size(), waitingApprovalHours);
        for (Booking booking : expired) {
            try {
                expireWaitingApprovalOne(booking.getId());
            } catch (Exception ex) {
                log.error("Failed to expire waiting-approval booking {}: {}",
                    booking.getId(), ex.getMessage(), ex);
            }
        }
    }

    /** Expire 1 booking PENDING_PAYMENT trong transaction riêng (REQUIRES_NEW) — nếu row này fail (ví dụ unique constraint do customer có 2 booking cùng... */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void expireOneBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.PENDING_PAYMENT) return;

        // 1. Cancel Stripe hold nếu customer đã trả nhưng chưa được driver duyệt
        try {
            paymentService.cancelPayment(bookingId);
        } catch (Exception ex) {
            log.warn("Failed to cancel payment for expired booking {}: {}", bookingId, ex.getMessage());
        }

        // 2. Set payment FAILED với lý do hết hạn
        paymentRepository.findByBookingId(bookingId).ifPresent(p -> {
            p.setStatus(PaymentStatus.FAILED);
            p.setFailureReason("Hết hạn thanh toán");
            paymentRepository.save(p);
        });

        // 3. Set booking EXPIRED — có thể fail với duplicate (customer, trip, EXPIRED)
        try {
            booking.setStatus(BookingStatus.EXPIRED);
            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancelReason("Hết hạn thanh toán");
            bookingRepository.save(booking);
            log.info("Booking {} EXPIRED", bookingId);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Đã có 1 booking EXPIRED khác cho cùng (customer, trip) từ lần chạy
            // scheduler trước — skip silently
            log.warn("Skip expire booking {} — duplicate (customer, trip, EXPIRED) already exists",
                bookingId);
        }
    }

    /** Expire 1 booking WAITING_DRIVER_APPROVAL quá 24h. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void expireWaitingApprovalOne(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.WAITING_DRIVER_APPROVAL) return;

        BookingStatus prevStatus = booking.getStatus();

        // 1. Cancel Stripe hold → release tiền về customer
        try {
            paymentService.cancelPayment(bookingId);
        } catch (Exception ex) {
            log.warn("Failed to cancel Stripe payment for waiting-approval booking {}: {}",
                bookingId, ex.getMessage());
        }

        // 2. Set payment VOIDED với lý do "driver không duyệt trong X giờ"
        paymentRepository.findByBookingId(bookingId).ifPresent(p -> {
            p.setStatus(PaymentStatus.VOIDED);
            p.setFailureReason("Tài xế không duyệt trong " + waitingApprovalHours + "h");
            paymentRepository.save(p);
        });

        // 3. Set booking EXPIRED
        try {
            booking.setStatus(BookingStatus.EXPIRED);
            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancelReason("Tài xế không duyệt trong " + waitingApprovalHours + "h");
            bookingRepository.save(booking);
            log.info("Booking {} EXPIRED (was WAITING_DRIVER_APPROVAL, prev={})",
                bookingId, prevStatus);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            log.warn("Skip expire waiting-approval booking {} — duplicate (customer, trip, EXPIRED)",
                bookingId);
        }

        // 4. KHÔNG cần release ghế — WAITING_DRIVER_APPROVAL chưa được driver duyệt
        // nên ghế chưa từng bị reserve.
    }

    /** Được gọi từ BookingEventListener.onPaymentAuthorized sau khi Stripe webhook authorize thành công. */
    @Transactional
    public void markPaymentAuthorized(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            log.warn("markPaymentAuthorized: booking {} not found", bookingId);
            return;
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            log.info("markPaymentAuthorized: booking {} not in PENDING_PAYMENT (current={}), skip",
                bookingId, booking.getStatus());
            return;
        }
        booking.setStatus(BookingStatus.WAITING_DRIVER_APPROVAL);
        bookingRepository.save(booking);
        log.info("Booking {} → WAITING_DRIVER_APPROVAL (payment authorized)", bookingId);
    }

    private void ensureDriverOwnsTrip(Booking booking, String driverUserId) {
        if (!booking.getTrip().getDriver().getId().equals(driverUserId)) {
            throw AppException.forbidden("Bạn không sở hữu chuyến này");
        }
    }

    /** Resolve ward theo id và validate thuộc đúng tỉnh (nếu provinceId != null). */
    private Ward resolveWard(String wardId, String expectedProvinceId, String kindLabel) {
        if (wardId == null || wardId.isBlank()) return null;
        Ward w = wardRepository.findById(wardId)
            .orElseThrow(() -> AppException.badRequest("Không tìm thấy phường/xã cho điểm " + kindLabel));
        if (expectedProvinceId != null
            && w.getProvince() != null
            && !expectedProvinceId.equals(w.getProvince().getId())) {
            throw AppException.badRequest("Phường/xã điểm " + kindLabel + " không thuộc tỉnh của chuyến");
        }
        return w;
    }

    public BookingResponse toResponse(Booking b) {
        Trip trip = b.getTrip();
        User customer = b.getCustomer();
        Ward pickupWard = b.getPickupWard();
        Ward dropoffWard = b.getDropoffWard();
        Payment payment = b.getPayment();
        return BookingResponse.builder()
            .id(b.getId())
            .bookingCode(b.getBookingCode())
            .customerId(customer.getId())
            .tripId(trip.getId())
            .status(b.getStatus())
            .paymentId(payment != null ? payment.getId() : null)
            .paymentStatus(b.getPaymentStatus())
            .paymentUrl(payment != null ? payment.getPaymentUrl() : null)
            .seatCount(b.getSeatCount())
            .pricePerSeat(b.getPricePerSeat())
            .totalAmount(b.getTotalAmount())
            .pickupLat(b.getPickupLat())
            .pickupLng(b.getPickupLng())
            .pickupWardId(pickupWard != null ? pickupWard.getId() : null)
            .pickupAddressText(b.getPickupAddressText())
            .dropoffLat(b.getDropoffLat())
            .dropoffLng(b.getDropoffLng())
            .dropoffWardId(dropoffWard != null ? dropoffWard.getId() : null)
            .dropoffAddressText(b.getDropoffAddressText())
            .userAvatar(customer.getAvatarUrl())
            .userName(customer.getFullName())
            .note(b.getNote())
            .reservedAt(b.getReservedAt())
            .expiresAt(b.getExpiresAt())
            .cancelledAt(b.getCancelledAt())
            .cancelReason(b.getCancelReason())
            .createdAt(b.getCreatedAt())
            .updatedAt(b.getUpdatedAt())
            .build();
    }
}