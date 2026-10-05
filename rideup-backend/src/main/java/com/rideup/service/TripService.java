package com.rideup.service;

import com.rideup.dto.request.*;
import com.rideup.dto.response.*;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Province;
import com.rideup.entity.Trip;
import com.rideup.entity.TripStop;
import com.rideup.entity.Vehicle;
import com.rideup.entity.Ward;
import com.rideup.enums.StopType;
import com.rideup.enums.TripStatus;
import com.rideup.exception.AppException;
import com.rideup.repository.ProvinceRepository;
import com.rideup.repository.TripRepository;
import com.rideup.repository.WardRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
/**
 * Nghiệp vụ chuyến xe và tìm chuyến có ranking.
 *
 * <p>
 * Customer đặt vé → ghế được reserve ngay (Optimistic Lock).
 * Tài xế xác nhận → CONFIRMED. Hủy vé → ghế trả lại.
 * </p>
 */
public class TripService {

    TripRepository tripRepository;
    WardRepository wardRepository;
    ProvinceRepository provinceRepository;
    DriverService driverService;
    VehicleService vehicleService;
    LocationService locationService;

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
                .startAddressText(req.getStartAddressText())
                .pickupLat(req.getPickupLat())
                .pickupLng(req.getPickupLng())
                .endAddressText(req.getEndAddressText())
                .departureTime(req.getDepartureTime())
                .estimatedArrivalTime(req.getEstimatedArrivalTime())
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
                if (!ward.getProvinceId().equals(provinceId)) {
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
        return toResponse(trip);
    }

    @Transactional(readOnly = true)
    public List<TripResponse> listMyTrips(String userId) {
        return tripRepository.findByDriverIdOrderByDepartureTimeDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<TripResponse> searchTrips(SearchTripsRequest req) {
        Province start = locationService.getProvinceEntity(req.getStartProvinceId());
        Province end = locationService.getProvinceEntity(req.getEndProvinceId());
        Ward startWard = locationService.getWardEntity(req.getStartWardId());
        Ward endWard = locationService.getWardEntity(req.getEndWardId());

        if (!start.getId().equals(startWard.getProvinceId())) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST, 400,
                    "Xã/phường đi không thuộc tỉnh đi");
        }
        if (!end.getId().equals(endWard.getProvinceId())) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST, 400,
                    "Xã/phường đến không thuộc tỉnh đến");
        }

        LocalDateTime startOfDay = req.getDepartureDate().atStartOfDay();
        LocalDateTime endOfDay = req.getDepartureDate().atTime(23, 59, 59);

        return tripRepository.searchTripsByRouteAndWards(
                TripStatus.OPEN,
                start.getId(),
                end.getId(),
                startWard.getId(),
                endWard.getId(),
                startOfDay,
                endOfDay)
                .stream().map(this::toResponse).toList();
    }

/**
     * Tìm chuyến với thuật toán ranking (4 tiêu chí: thời gian + giá + rating + khoảng cách).
     * Hiện tại trả về kết quả sort theo {@code departureTime} ASC — chờ thay bằng weighted sum.
     */
    @Transactional(readOnly = true)
    public List<TripResponse> searchTripsRanked(SearchTripsRequest req) {
        return searchTrips(req);
    }

    /**
     * Reserve {@code seatCount} ghế của chuyến trong transaction hiện tại.
     * Dùng OPTIMISTIC lock (dựa trên {@code @Version} của {@link Trip}) —
     * không giữ row lock. Khi commit mà version đã bị transaction khác cập
     * nhật, Hibernate ném {@code ObjectOptimisticLockingFailureException} →
     * caller (vd. {@code BookingService}) phải retry.
     *
     * @throws AppException 404 nếu không thấy trip, 409 nếu hết ghế, 400 nếu
     *                      trip không nhận đặt chỗ hoặc seatCount không hợp lệ.
     */
    @Transactional
    public Trip reserveSeat(String tripId, int seatCount) {
        if (seatCount <= 0) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST, 400,
                    "Số ghế phải lớn hơn 0");
        }
        Trip trip = tripRepository.findByIdForUpdate(tripId)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND, 404,
                        "Không tìm thấy chuyến"));
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
            // Có người huỷ trước đó → mở lại chuyến
            trip.setStatus(TripStatus.OPEN);
        }
        return tripRepository.save(trip);
    }

    /**
     * Trả lại {@code seatCount} ghế khi huỷ booking. Mở PESSIMISTIC_WRITE lock
     * trên trip để cập nhật seat_available nhất quán — propagation REQUIRED sẽ
     * join vào transaction của caller (vd. {@code BookingService.reject}).
     */
    @Transactional
    public void releaseSeat(String tripId, int seatCount) {
        if (seatCount <= 0) {
            return;
        }
        Trip trip = tripRepository.findByIdForUpdate(tripId)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND, 404,
                        "Không tìm thấy chuyến"));
        int newAvailable = Math.min(trip.getSeatTotal(),
                trip.getSeatAvailable() + seatCount);
        trip.setSeatAvailable(newAvailable);
        if (trip.getStatus() == TripStatus.FULL && newAvailable > 0) {
            trip.setStatus(TripStatus.OPEN);
        }
        tripRepository.save(trip);
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

    private Province findProvinceByCode(String code) {
        return provinceRepository.findByCode(code)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND, 404,
                        "Tỉnh không tồn tại: " + code));
    }

    private TripResponse toResponse(Trip t) {
        TripResponse.TripResponseBuilder b = TripResponse.builder()
                .id(t.getId())
                .driverId(t.getDriver().getId())
                .driverName(t.getDriver().getFullName())
                .vehicleId(t.getVehicle().getId())
                .startProvinceId(t.getStartProvince().getId())
                .endProvinceId(t.getEndProvince().getId())
                .startAddressText(t.getStartAddressText())
                .endAddressText(t.getEndAddressText())
                .departureTime(t.getDepartureTime())
                .estimatedArrivalTime(t.getEstimatedArrivalTime())
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