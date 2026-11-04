package com.rideup.service;

import com.rideup.dto.request.*;
import com.rideup.dto.response.*;
import com.rideup.entity.Booking;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Province;
import com.rideup.entity.Trip;
import com.rideup.entity.TripStop;
import com.rideup.entity.Vehicle;
import com.rideup.entity.Ward;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import com.rideup.enums.StopType;
import com.rideup.enums.TripStatus;
import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.ProvinceRepository;
import com.rideup.repository.TripRepository;
import com.rideup.repository.WardRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripService {

    TripRepository tripRepository;
    WardRepository wardRepository;
    ProvinceRepository provinceRepository;
    DriverService driverService;
    VehicleService vehicleService;
    LocationService locationService;
    BookingRepository bookingRepository;
    PaymentService paymentService;
    DriverProfileRepository driverProfileRepository;
    RealtimeService realtimeService;
    EntityManager entityManager;

    @Transactional
    public TripResponse createTrip(String userId, CreateTripRequest req) {
        DriverProfile driver = driverService.requireApprovedDriver(userId);
        Vehicle vehicle = vehicleService.requireVerifiedVehicle(driver.getId());

        Province start = locationService.getProvinceEntity(req.getStartProvinceId());
        Province end = locationService.getProvinceEntity(req.getEndProvinceId());

        if (req.getSeatTotal() > vehicle.getSeatCapacity()) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST, 400,
                    "Số ghế vượt quá sức chứa của xe (" + vehicle.getSeatCapacity() + " chỗ)");
        }

        Trip trip = Trip.builder()
                .driver(driver.getUser())
                .vehicle(vehicle)
                .startProvince(start)
                .endProvince(end)
                .departureTime(req.getDepartureTime())
                .seatTotal(req.getSeatTotal())
                .seatAvailable(req.getSeatTotal())
                .priceVnd(req.getPriceVnd())
                .note(req.getNote())
                .status(TripStatus.OPEN)
                .build();

        List<TripStopRequest> stops = req.getStops();
        if (stops != null && !stops.isEmpty()) {
            Set<String> wardIds = stops.stream()
                    .map(TripStopRequest::getWardId)
                    .collect(Collectors.toSet());
            Map<String, Ward> wardsById = wardRepository.findAllById(wardIds)
                    .stream()
                    .collect(Collectors.toMap(Ward::getId, w -> w));

            for (TripStopRequest s : stops) {
                Ward ward = wardsById.get(s.getWardId());
                if (ward == null) {
                    throw new AppException(
                            HttpStatus.BAD_REQUEST, 400,
                            "Phường/xã '" + s.getWardId() + "' không tồn tại");
                }
                boolean isPickup = s.getStopType() == StopType.PICKUP;
                String provinceId = isPickup ? start.getId() : end.getId();
                if (ward.getProvince() == null || !ward.getProvince().getId().equals(provinceId)) {
                    throw new AppException(
                            HttpStatus.BAD_REQUEST, 400,
                            "Phường/xã '" + s.getWardId() + "' không thuộc tỉnh " +
                                    (isPickup ? "đón" : "trả"));
                }
                TripStop stop = TripStop.builder()
                        .stopType(s.getStopType())
                        .ward(ward)
                        .addressText(s.getAddressText())
                        .build();
                trip.addStop(stop);
            }
        }

        trip = tripRepository.save(trip);
        log.info("Trip created id={} driverProfile={} plate={} {} -> {} stops={} seats={}",
                trip.getId(), driver.getId(), vehicle.getPlateNumber(),
                start.getCode(), end.getCode(),
                trip.getStops() == null ? 0 : trip.getStops().size(),
                trip.getSeatTotal());
        realtimeService.tripChanged(trip);
        return toResponse(trip);
    }

    @Transactional(readOnly = true)
    public List<TripResponse> listMyTrips(String userId) {
        return tripRepository.findByDriverIdOrderByDepartureTimeDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final long START_EARLY_MINUTES = 30;

    @Transactional(readOnly = true)
    public List<TripResponse> searchTrips(SearchTripsRequest req) {
        Province start = locationService.getProvinceEntity(req.getStartProvinceId());
        Province end = locationService.getProvinceEntity(req.getEndProvinceId());
        String startWardId = null;
        if (req.getStartWardId() != null && !req.getStartWardId().isBlank()) {
            Ward startWard = locationService.getWardEntity(req.getStartWardId());
            if (startWard.getProvince() == null || !start.getId().equals(startWard.getProvince().getId())) {
                throw new AppException(
                        HttpStatus.BAD_REQUEST, 400,
                        "Xã/phường đi không thuộc tỉnh đi");
            }
            startWardId = startWard.getId();
        }
        String endWardId = null;
        if (req.getEndWardId() != null && !req.getEndWardId().isBlank()) {
            Ward endWard = locationService.getWardEntity(req.getEndWardId());
            if (endWard.getProvince() == null || !end.getId().equals(endWard.getProvince().getId())) {
                throw new AppException(
                        HttpStatus.BAD_REQUEST, 400,
                        "Xã/phường đến không thuộc tỉnh đến");
            }
            endWardId = endWard.getId();
        }

        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        if (req.getDepartureDate().isBefore(now.toLocalDate())) {
            throw new AppException(ErrorCode.SEARCH_DATE_IN_PAST);
        }
        LocalDateTime startOfDay = req.getDepartureDate().atStartOfDay();
        if (startOfDay.isBefore(now)) {
            startOfDay = now;  // hôm nay chỉ lấy chuyến có giờ đi từ bây giờ
        }
        LocalDateTime endOfDay = req.getDepartureDate().atTime(23, 59, 59);

        return tripRepository.searchTripsByRouteAndWards(
                TripStatus.OPEN,
                start.getId(),
                end.getId(),
                startWardId,
                endWardId,
                startOfDay,
                endOfDay)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<TripResponse> searchTripsRanked(SearchTripsRequest req) {
        return searchTrips(req);
    }

    @Transactional
    public Trip reserveSeat(String tripId, int seatCount) {
        if (seatCount <= 0) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST, 400,
                    "Số ghế phải lớn hơn 0");
        }
        Trip trip = lockTripForUpdate(tripId);
        if (trip.getStatus() != TripStatus.OPEN && trip.getStatus() != TripStatus.FULL) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST, 400,
                    "Chuyến không còn nhận đặt chỗ");
        }
        if (trip.getSeatAvailable() < seatCount) {
            throw new AppException(
                    HttpStatus.CONFLICT, 409,
                    "Chuyến chỉ còn " + trip.getSeatAvailable() + " ghế");
        }
        int newAvailable = trip.getSeatAvailable() - seatCount;
        trip.setSeatAvailable(newAvailable);
        if (newAvailable == 0) {
            trip.setStatus(TripStatus.FULL);
        } else if (trip.getStatus() == TripStatus.FULL && newAvailable > 0) {
            trip.setStatus(TripStatus.OPEN);
        }
        return tripRepository.save(trip);
    }

    // dùng refresh() chứ không dùng query @Lock, vì trip có thể đã nằm trong persistence context nên query trả về bản cũ
    // request thứ 2 sẽ đợi request đầu commit rồi mới đọc
    private Trip lockTripForUpdate(String tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND, 404,
                        "Không tìm thấy chuyến"));
        // flush trước vì refresh() ghi đè thay đổi chưa flush (vd. cancelTrip vừa set CANCELED rồi mới gọi releaseSeat)
        entityManager.flush();
        entityManager.refresh(trip, LockModeType.PESSIMISTIC_WRITE);
        return trip;
    }

    @Transactional
    public void releaseSeat(String tripId, int seatCount) {
        if (seatCount <= 0) {
            return;
        }
        Trip trip = lockTripForUpdate(tripId);
        int newAvailable = Math.min(trip.getSeatTotal(),
                trip.getSeatAvailable() + seatCount);
        trip.setSeatAvailable(newAvailable);
        if (trip.getStatus() == TripStatus.FULL && newAvailable > 0) {
            trip.setStatus(TripStatus.OPEN);
        }
        tripRepository.save(trip);
        realtimeService.tripChanged(trip);
    }

    @Transactional
    public TripResponse confirm(String tripId, String driverUserId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND, 404,
                        "Không tìm thấy chuyến"));
        if (!trip.getDriver().getId().equals(driverUserId)) {
            throw new AppException(
                    HttpStatus.FORBIDDEN, 403,
                    "Bạn không sở hữu chuyến này");
        }
        if (trip.getStatus() != TripStatus.OPEN && trip.getStatus() != TripStatus.FULL) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST, 400,
                    "Chuyến không ở trạng thái OPEN/FULL");
        }
        return toResponse(trip);
    }

    @Transactional
    public TripResponse startTrip(String tripId, String driverUserId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND, 404, "Không tìm thấy chuyến"));
        if (!trip.getDriver().getId().equals(driverUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, 403, "Bạn không sở hữu chuyến này");
        }
        if (trip.getStatus() != TripStatus.OPEN && trip.getStatus() != TripStatus.FULL) {
            throw new AppException(HttpStatus.BAD_REQUEST, 400,
                "Chỉ chuyến OPEN/FULL mới có thể bắt đầu (hiện tại: " + trip.getStatus() + ")");
        }
        if (trip.getDepartureTime() != null
                && trip.getDepartureTime().minusMinutes(START_EARLY_MINUTES).isAfter(LocalDateTime.now(VN_ZONE))) {
            throw new AppException(HttpStatus.BAD_REQUEST, 400,
                "Chưa đến giờ khởi hành (" + trip.getDepartureTime() + "). Chỉ được bắt đầu sớm tối đa "
                + START_EARLY_MINUTES + " phút");
        }
        trip.setStatus(TripStatus.STARTED);
        trip = tripRepository.save(trip);
        log.info("Driver {} started trip {}", driverUserId, tripId);

        // chuyến đã chạy thì booking chờ duyệt bị từ chối và huỷ cọc Stripe
        List<Booking> waiting = bookingRepository.findByTripIdAndStatusIn(
                tripId, List.of(BookingStatus.WAITING_DRIVER_APPROVAL));
        for (Booking b : waiting) {
            b.setStatus(BookingStatus.REJECTED_BY_DRIVER);
            b.setCancelledAt(LocalDateTime.now(VN_ZONE));
            b.setCancelReason("Chuyến đã khởi hành, tài xế chưa duyệt booking");
            bookingRepository.save(b);
            realtimeService.bookingChanged(b);
            try {
                paymentService.cancelPayment(b.getId());
            } catch (Exception ex) {
                log.warn("cancelPayment failed for booking {} when starting trip: {}", b.getId(), ex.getMessage());
            }
        }
        realtimeService.tripChanged(trip);
        return toResponse(trip);
    }

    @Transactional
    public TripResponse completeTrip(String tripId, String driverUserId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND, 404, "Không tìm thấy chuyến"));
        if (!trip.getDriver().getId().equals(driverUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, 403, "Bạn không sở hữu chuyến này");
        }
        if (trip.getStatus() != TripStatus.STARTED) {
            throw new AppException(HttpStatus.BAD_REQUEST, 400,
                "Chỉ chuyến STARTED mới có thể kết thúc (hiện tại: " + trip.getStatus() + ")");
        }
        trip.setStatus(TripStatus.COMPLETED);
        trip = tripRepository.save(trip);

        driverProfileRepository.findByUserId(driverUserId).ifPresent(p -> {
            int rides = p.getTotalDriverRides() == null ? 0 : p.getTotalDriverRides();
            p.setTotalDriverRides(rides + 1);
            driverProfileRepository.save(p);
        });

        try {
            java.util.List<Booking> bookings = bookingRepository.findByTripIdAndStatusIn(tripId,
                java.util.List.of(BookingStatus.CONFIRMED));
            for (Booking b : bookings) {
                if (b.getPayment() != null
                    && b.getPayment().getMethod() == PaymentMethod.STRIPE
                    && b.getPayment().getStatus() == PaymentStatus.HOLDING) {
                    paymentService.capturePayment(b.getId());
                }
                b.setStatus(BookingStatus.COMPLETED);
                bookingRepository.save(b);
                realtimeService.bookingChanged(b);
            }
        } catch (Exception ex) {
            log.warn("Failed to auto-capture payments for trip {}: {}", tripId, ex.getMessage());
        }

        log.info("Driver {} completed trip {}", driverUserId, tripId);
        realtimeService.tripChanged(trip);
        return toResponse(trip);
    }

    @Transactional
    public TripResponse cancelTrip(String tripId, String driverUserId, String reason) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND, 404, "Không tìm thấy chuyến"));
        if (!trip.getDriver().getId().equals(driverUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, 403, "Bạn không sở hữu chuyến này");
        }
        if (trip.getStatus() == TripStatus.COMPLETED || trip.getStatus() == TripStatus.CANCELED) {
            throw new AppException(HttpStatus.BAD_REQUEST, 400,
                "Không thể huỷ chuyến đã hoàn thành hoặc đã huỷ");
        }

        String cancelReason = "Tài xế huỷ chuyến: " + (reason == null || reason.isBlank() ? "Không rõ" : reason);
        cancelTripAndBookings(trip, cancelReason);
        return toResponse(trip);
    }

    @Transactional
    public boolean autoCancelIfNoShow(String tripId, int graceMinutes) {
        Trip trip = lockTripForUpdate(tripId);
        LocalDateTime deadline = LocalDateTime.now(VN_ZONE).minusMinutes(graceMinutes);
        boolean cancellable = trip.getStatus() == TripStatus.OPEN || trip.getStatus() == TripStatus.FULL;
        if (!cancellable || !trip.getDepartureTime().isBefore(deadline)) {
            return false;
        }
        cancelTripAndBookings(trip, "Hệ thống tự huỷ: tài xế không bắt đầu chuyến sau "
                + graceMinutes + " phút kể từ giờ khởi hành");
        return true;
    }

    private void cancelTripAndBookings(Trip trip, String cancelReason) {
        String tripId = trip.getId();
        trip.setStatus(TripStatus.CANCELED);
        tripRepository.save(trip);

        java.util.List<Booking> activeBookings = bookingRepository.findByTripIdAndStatusIn(tripId,
            java.util.List.of(
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.WAITING_DRIVER_APPROVAL,
                BookingStatus.CONFIRMED));

        log.info("Cancelling trip {} — {} active bookings will be refunded ({})",
            tripId, activeBookings.size(), cancelReason);

        for (Booking b : activeBookings) {
            BookingStatus prev = b.getStatus();
            b.setStatus(BookingStatus.CANCELLED_BY_DRIVER);
            b.setCancelledAt(LocalDateTime.now(VN_ZONE));
            b.setCancelReason(cancelReason);
            bookingRepository.save(b);
            realtimeService.bookingChanged(b);

            try {
                paymentService.cancelPayment(b.getId());
            } catch (Exception ex) {
                log.warn("cancelPayment failed for booking {} during trip cancel: {}",
                    b.getId(), ex.getMessage());
            }

            // chỉ trả ghế nếu booking đã CONFIRMED
            if (prev == BookingStatus.CONFIRMED) {
                releaseSeat(tripId, b.getSeatCount() == null ? 1 : b.getSeatCount());
            }
        }

        log.info("Cancelled trip {} — refunded {} bookings", tripId, activeBookings.size());
        realtimeService.tripChanged(trip);
    }

    private TripResponse toResponse(Trip t) {
        TripResponse.TripResponseBuilder b = TripResponse.builder()
                .id(t.getId())
                .driverId(t.getDriver().getId())
                .driverName(t.getDriver().getFullName())
                .vehicleId(t.getVehicle().getId())
                .startProvinceId(t.getStartProvince().getId())
                .endProvinceId(t.getEndProvince().getId())
                .departureTime(t.getDepartureTime())
                .seatTotal(t.getSeatTotal())
                .seatAvailable(t.getSeatAvailable())
                .priceVnd(t.getPriceVnd())
                .status(t.getStatus())
                .note(t.getNote())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt());

        List<TripStop> stops = t.getStops();
        if (stops != null && !stops.isEmpty()) {
            b.stops(stops.stream().map(s -> TripStopResponse.builder()
                    .id(s.getId())
                    .stopType(s.getStopType())
                    .wardId(s.getWard() != null ? s.getWard().getId() : null)
                    .addressText(s.getAddressText())
                    .build()).toList());
        }

        return b.build();
    }
}