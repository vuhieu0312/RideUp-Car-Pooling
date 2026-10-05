package com.rideup.service;

import com.rideup.exception.AppException;
import com.rideup.dto.request.CreateBookingRequest;
import com.rideup.dto.response.BookingResponse;
import com.rideup.entity.Booking;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Trip;
import com.rideup.entity.User;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentStatus;
import com.rideup.enums.TripStatus;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.TripRepository;
import com.rideup.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
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
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
/**
 * Nghiệp vụ đặt vé và xác nhận vé (UC24 + UC28).
 *
 * <p>Customer đặt vé → ghế được reserve ngay (Optimistic Lock).
 * Tài xế xác nhận → CONFIRMED. Hủy vé → ghế trả lại.</p>
 */
public class BookingService {

    BookingRepository bookingRepository;
    TripRepository tripRepository;
    TripService tripService;
    UserRepository userRepository;
    DriverProfileRepository driverProfileRepository;

    /**
     * Số lần retry tối đa khi gặp optimistic lock conflict. Mỗi lần retry là
     * 1 transaction MỚI (xem {@link #createBookingInternal}), vì vậy state
     * (check duplicate, version) được load lại từ DB.
     */
    private static final int MAX_RETRY = 3;

    /**
     * Khách đặt chỗ. Wrapper retry loop (không {@code @Transactional}) — mỗi
     * lần thất bại do optimistic lock, gọi lại {@link #createBookingInternal}
     * trong 1 transaction mới. Áp dụng backoff ngẫu nhiên nhỏ để tránh
     * thundering herd khi nhiều customer book cùng trip nóng.
     */
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

    /**
     * Logic chính đặt vé — chạy trong 1 transaction riêng (REQUIRES_NEW) để
     * mỗi lần retry được rollback sạch và đọc state mới từ DB.
     *
     * <p>Thứ tự xử lý an toàn với race condition:
     * <ol>
     *   <li>Validate customer/trip/status</li>
     *   <li>Check duplicate booking (cheap query) — trước khi đụng ghế</li>
     *   <li>Reserve ghế qua {@code TripService.reserveSeat} (OPTIMISTIC)</li>
     *   <li>Save booking; nếu commit mà version cũ → caller retry</li>
     * </ol>
     * </p>
     */
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

        if (trip.getDriver().getId().equals(userId)) {
            throw AppException.badRequest("Không thể đặt chuyến của chính mình");
        }

        int seats = req.getSeatCount() == null ? 1 : req.getSeatCount();

        // (1) Check duplicate booking TRƯỚC khi reserve ghế
        Set<BookingStatus> activeStatuses = EnumSet.of(BookingStatus.PENDING, BookingStatus.CONFIRMED);
        if (bookingRepository.existsByCustomerIdAndTripIdAndStatusIn(
                userId, trip.getId(), List.copyOf(activeStatuses))) {
            throw AppException.conflict("Bạn đã có booking đang chờ hoặc đã xác nhận cho chuyến này");
        }

        // (2) Reserve ghế — OPTIMISTIC lock. Nếu trip vừa được customer khác
        // update, Hibernate sẽ throw ObjectOptimisticLockingFailureException
        // lúc commit → outer retry loop sẽ gọi lại method này.
        Trip updated = tripService.reserveSeat(trip.getId(), seats);

        // (3) Save booking — nếu vi phạm unique constraint (customer_id,
        // trip_id, status) thì throw ngay, không retry.
        BigDecimal pricePerSeat = updated.getPriceVnd();
        BigDecimal total = pricePerSeat.multiply(BigDecimal.valueOf(seats));

        Booking booking = Booking.builder()
            .bookingCode("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .customer(customer)
            .trip(updated)
            .status(BookingStatus.PENDING)
            .paymentStatus(PaymentStatus.PENDING)
            .seatCount(seats)
            .pricePerSeat(pricePerSeat)
            .totalAmount(total)
            .reservedAt(LocalDateTime.now())
            .expiresAt(LocalDateTime.now().plusHours(2))
            .pickupAddressText(req.getPickupAddressText())
            .pickupLat(req.getPickupLat())
            .pickupLng(req.getPickupLng())
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

        log.info("Booking created id={} code={} trip={} seats={} amount={}",
            booking.getId(), booking.getBookingCode(),
            trip.getId(), seats, total);
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

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw AppException.badRequest("Booking không ở trạng thái chờ duyệt");
        }

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

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw AppException.badRequest("Booking không ở trạng thái chờ duyệt");
        }

        booking.setStatus(BookingStatus.CANCELLED_USER);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason("Tài xế từ chối: " + reason);
        booking = bookingRepository.save(booking);

        // Trả ghế cho chuyến (theo đúng số ghế đã reserve)
        tripService.releaseSeat(booking.getTrip().getId(),
            booking.getSeatCount() == null ? 1 : booking.getSeatCount());

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
        if (booking.getStatus() == BookingStatus.COMPLETED || booking.getStatus() == BookingStatus.CANCELLED_USER) {
            throw AppException.badRequest("Booking không thể huỷ");
        }

        booking.setStatus(BookingStatus.CANCELLED_USER);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(reason);
        booking = bookingRepository.save(booking);

        // Trả ghế (theo đúng số ghế đã reserve)
        tripService.releaseSeat(booking.getTrip().getId(),
            booking.getSeatCount() == null ? 1 : booking.getSeatCount());

        log.info("Customer {} cancelled booking {}", userId, bookingId);
        return toResponse(booking);
    }

    private void ensureDriverOwnsTrip(Booking booking, String driverUserId) {
        if (!booking.getTrip().getDriver().getId().equals(driverUserId)) {
            throw AppException.forbidden("Bạn không sở hữu chuyến này");
        }
    }

    public BookingResponse toResponse(Booking b) {
        Trip trip = b.getTrip();
        User customer = b.getCustomer();
        User driverUser = trip != null ? trip.getDriver() : null;
        return BookingResponse.builder()
            .id(b.getId())
            .bookingCode(b.getBookingCode())
            .customerId(customer.getId())
            .customerName(customer.getFullName())
            .customerPhone(customer.getPhone())
            .tripId(trip.getId())
            .tripDeparture(trip.getDepartureTime() != null ? trip.getDepartureTime().toString() : null)
            .tripPlate(trip.getVehicle() != null ? trip.getVehicle().getPlateNumber() : null)
            .status(b.getStatus())
            .paymentStatus(b.getPaymentStatus())
            .seatCount(b.getSeatCount())
            .pricePerSeat(b.getPricePerSeat())
            .totalAmount(b.getTotalAmount())
            .reservedAt(b.getReservedAt())
            .expiresAt(b.getExpiresAt())
            .pickupAddressText(b.getPickupAddressText())
            .pickupLat(b.getPickupLat())
            .pickupLng(b.getPickupLng())
            .dropoffAddressText(b.getDropoffAddressText())
            .dropoffLat(b.getDropoffLat())
            .dropoffLng(b.getDropoffLng())
            .note(b.getNote())
            .cancelledAt(b.getCancelledAt())
            .cancelReason(b.getCancelReason())
            .createdAt(b.getCreatedAt())
            .build();
    }
}