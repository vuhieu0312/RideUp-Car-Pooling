package com.rideup.service;

import com.rideup.dto.request.RegisterVehicleRequest;
import com.rideup.dto.request.VehicleFields;
import com.rideup.dto.response.VehicleResponse;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Vehicle;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.NotificationType;
import com.rideup.enums.TripStatus;
import com.rideup.enums.VehicleStatus;
import com.rideup.exception.AppException;
import com.rideup.repository.TripRepository;
import com.rideup.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VehicleService {

    public static final String PLATE_TAKEN = "Biển số xe đã được đăng ký cho một xe đang dùng hoặc đang chờ duyệt";

    private static final String PLATE_PATTERN = "\\d{2,3}[A-Z]{1,2}\\d{4,5}";
    private static final List<TripStatus> UNFINISHED_TRIP = List.of(TripStatus.OPEN, TripStatus.FULL, TripStatus.STARTED);

    VehicleRepository vehicleRepository;
    TripRepository tripRepository;
    DriverService driverService;
    FileService fileService;
    MailService mailService;
    RealtimeService realtimeService;

    @Transactional
    public VehicleResponse registerVehicle(String userId, RegisterVehicleRequest req,
            MultipartFile vehicleImage, MultipartFile registrationImage) {
        DriverProfile driver = driverService.requireApprovedDriver(userId);
        String plate = normalizePlate(req.getPlateNumber());
        ensurePlateAvailable(plate, null);
        ensureNoPendingVehicle(driver.getId());

        Vehicle vehicle = Vehicle.builder()
            .driverProfile(driver)
            .vehicleImage(fileService.upload(vehicleImage, "vehicle-photo"))
            .registrationImage(fileService.upload(registrationImage, "vehicle-reg"))
            .build();
        applyFields(vehicle, req, plate);
        markPending(vehicle);

        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle registered id={} driverProfile={} plate={}",
            vehicle.getId(), driver.getId(), vehicle.getPlateNumber());
        realtimeService.vehicleChanged(userId);
        realtimeService.adminQueueChanged();
        return toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse resubmitVehicle(String userId, String vehicleId, RegisterVehicleRequest req,
            MultipartFile vehicleImage, MultipartFile registrationImage) {
        DriverProfile driver = driverService.requireApprovedDriver(userId);
        Vehicle vehicle = requireOwnVehicle(driver, vehicleId);
        if (statusOf(vehicle) != VehicleStatus.REJECTED) {
            throw AppException.badRequest("Chỉ được sửa và gửi lại khi phương tiện bị từ chối");
        }
        String plate = normalizePlate(req.getPlateNumber());
        ensurePlateAvailable(plate, vehicle.getId());
        ensureNoPendingVehicle(driver.getId());

        applyFields(vehicle, req, plate);
        if (FileService.hasFile(vehicleImage)) {
            vehicle.setVehicleImage(fileService.upload(vehicleImage, "vehicle-photo"));
        }
        if (FileService.hasFile(registrationImage)) {
            vehicle.setRegistrationImage(fileService.upload(registrationImage, "vehicle-reg"));
        }
        requireImages(vehicle);
        markPending(vehicle);

        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle resubmitted id={} driverProfile={}", vehicle.getId(), driver.getId());
        realtimeService.vehicleChanged(userId);
        realtimeService.adminQueueChanged();
        return toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse requestReuse(String userId, String vehicleId) {
        DriverProfile driver = driverService.requireApprovedDriver(userId);
        Vehicle vehicle = requireOwnVehicle(driver, vehicleId);
        if (statusOf(vehicle) != VehicleStatus.INACTIVE) {
            throw AppException.badRequest("Chỉ dùng lại được xe đang ở trạng thái ngừng dùng");
        }
        ensurePlateAvailable(vehicle.getPlateNumber(), vehicle.getId());
        ensureNoPendingVehicle(driver.getId());

        markPending(vehicle);
        vehicle = vehicleRepository.save(vehicle);
        log.info("Driver {} requested reuse of vehicleId={}", driver.getId(), vehicle.getId());
        realtimeService.vehicleChanged(userId);
        realtimeService.adminQueueChanged();
        return toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse deactivate(String userId, String vehicleId) {
        DriverProfile driver = driverService.requireApprovedDriver(userId);
        Vehicle vehicle = requireOwnVehicle(driver, vehicleId);
        if (statusOf(vehicle) != VehicleStatus.ACTIVE) {
            throw AppException.badRequest("Xe này không ở trạng thái đang dùng");
        }
        ensureNoUnfinishedTrip(vehicle);

        vehicle.setIsActive(false);
        vehicle = vehicleRepository.save(vehicle);
        log.info("Driver {} deactivated vehicleId={}", driver.getId(), vehicle.getId());
        realtimeService.vehicleChanged(userId);
        return toResponse(vehicle);
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listMyVehicles(String userId) {
        DriverProfile driver = driverService.requireApprovedDriver(userId);
        return vehicleRepository.findByDriverProfileIdOrderByCreatedAtDesc(driver.getId())
            .stream().map(VehicleService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listPendingVehicles() {
        return vehicleRepository.findByIsVerifiedFalseAndRejectedAtIsNull().stream()
            .filter(v -> v.getDriverProfile().getStatus() == DriverStatus.APPROVED)
            .map(VehicleService::toResponse).toList();
    }

    @Transactional
    public VehicleResponse approve(String vehicleId, String adminUserId) {
        Vehicle vehicle = requireVehicle(vehicleId);
        if (statusOf(vehicle) != VehicleStatus.PENDING) {
            throw AppException.badRequest("Chỉ duyệt được phương tiện đang chờ duyệt");
        }
        DriverProfile owner = vehicle.getDriverProfile();
        if (owner.getStatus() != DriverStatus.APPROVED) {
            throw AppException.badRequest("Hồ sơ tài xế chưa được duyệt, xe sẽ được duyệt cùng hồ sơ tài xế");
        }

        activate(vehicle, adminUserId);
        log.info("Admin {} approved vehicleId={} driverProfile={}", adminUserId, vehicle.getId(), owner.getId());
        mailService.sendVehicleApproved(owner.getUser().getEmail(), owner.getUser().getFullName(), vehicle.getPlateNumber());
        realtimeService.notifyUser(owner.getUser(), NotificationType.VEHICLE_APPROVED, "Phương tiện đã được duyệt",
            "Xe " + vehicle.getPlateNumber() + " đã được duyệt và đang được sử dụng để tạo chuyến.", null, null, null);
        realtimeService.vehicleChanged(owner.getUser().getId());
        realtimeService.adminQueueChanged();
        return toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse reject(String vehicleId, String adminUserId, String reason) {
        Vehicle vehicle = requireVehicle(vehicleId);
        if (statusOf(vehicle) != VehicleStatus.PENDING) {
            throw AppException.badRequest("Chỉ từ chối được phương tiện đang chờ duyệt");
        }
        DriverProfile owner = vehicle.getDriverProfile();

        markRejected(vehicle, reason);
        log.info("Admin {} rejected vehicleId={} reason='{}'", adminUserId, vehicle.getId(), reason);
        mailService.sendVehicleRejected(owner.getUser().getEmail(), owner.getUser().getFullName(), vehicle.getPlateNumber(), reason);
        realtimeService.notifyUser(owner.getUser(), NotificationType.VEHICLE_REJECTED, "Phương tiện bị từ chối",
            "Xe " + vehicle.getPlateNumber() + " bị từ chối. Lý do: " + reason, null, null, null);
        realtimeService.vehicleChanged(owner.getUser().getId());
        realtimeService.adminQueueChanged();
        return toResponse(vehicle);
    }

    public void activate(Vehicle vehicle, String adminUserId) {
        vehicleRepository.findFirstByDriverProfileIdAndIsVerifiedTrueAndIsActiveTrue(vehicle.getDriverProfile().getId())
            .filter(old -> !old.getId().equals(vehicle.getId()))
            .ifPresent(old -> {
                ensureNoUnfinishedTrip(old);
                old.setIsActive(false);
                vehicleRepository.save(old);
            });

        vehicle.setIsVerified(true);
        vehicle.setIsActive(true);
        vehicle.setApprovedAt(LocalDateTime.now(TripService.VN_ZONE));
        vehicle.setApprovedBy(adminUserId);
        vehicle.setRejectedAt(null);
        vehicle.setRejectionReason(null);
        vehicleRepository.save(vehicle);
    }

    public void markRejected(Vehicle vehicle, String reason) {
        vehicle.setIsVerified(false);
        vehicle.setIsActive(false);
        vehicle.setRejectedAt(LocalDateTime.now(TripService.VN_ZONE));
        vehicle.setRejectionReason(reason);
        vehicle.setApprovedAt(null);
        vehicle.setApprovedBy(null);
        vehicleRepository.save(vehicle);
    }

    public Vehicle requireVerifiedVehicle(String driverProfileId) {
        return vehicleRepository.findFirstByDriverProfileIdAndIsVerifiedTrueAndIsActiveTrue(driverProfileId)
            .orElseThrow(() -> AppException.forbidden(
                "Bạn chưa có xe đang dùng đã được admin duyệt. Hãy đăng ký xe hoặc chờ admin duyệt xe mới."));
    }

    private Vehicle requireVehicle(String vehicleId) {
        return vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy phương tiện"));
    }

    private Vehicle requireOwnVehicle(DriverProfile driver, String vehicleId) {
        Vehicle vehicle = requireVehicle(vehicleId);
        if (!vehicle.getDriverProfile().getId().equals(driver.getId())) {
            throw AppException.forbidden("Phương tiện không thuộc về bạn");
        }
        return vehicle;
    }

    private void ensurePlateAvailable(String plate, String excludeVehicleId) {
        if (vehicleRepository.existsLivePlate(plate, excludeVehicleId)) {
            throw AppException.conflict(PLATE_TAKEN);
        }
    }

    private void ensureNoPendingVehicle(String driverProfileId) {
        if (vehicleRepository.findFirstByDriverProfileIdAndIsVerifiedFalseAndRejectedAtIsNull(driverProfileId).isPresent()) {
            throw AppException.badRequest("Bạn đang có một xe chờ admin duyệt, vui lòng đợi kết quả trước khi đổi xe khác");
        }
    }

    private void ensureNoUnfinishedTrip(Vehicle vehicle) {
        if (tripRepository.existsByVehicleIdAndStatusIn(vehicle.getId(), UNFINISHED_TRIP)) {
            throw AppException.badRequest("Xe " + vehicle.getPlateNumber()
                + " còn chuyến chưa hoàn thành, cần hoàn thành hoặc huỷ các chuyến này trước");
        }
    }

    public static String normalizePlate(String plate) {
        String normalized = plate == null ? "" : plate.toUpperCase().replaceAll("[-.\\s]", "");
        if (!normalized.matches(PLATE_PATTERN)) {
            throw AppException.badRequest("Biển số xe không hợp lệ (vd: 29A-12345)");
        }
        return normalized;
    }

    public static void applyFields(Vehicle vehicle, VehicleFields req, String plate) {
        vehicle.setPlateNumber(plate);
        vehicle.setVehicleBrand(req.getVehicleBrand());
        vehicle.setVehicleModel(req.getVehicleModel());
        vehicle.setVehicleYear(req.getVehicleYear());
        vehicle.setVehicleColor(req.getVehicleColor());
        vehicle.setSeatCapacity(req.getSeatCapacity());
        vehicle.setVehicleType(req.getVehicleType());
        vehicle.setRegistrationExpiryDate(req.getRegistrationExpiryDate());
    }

    public static void markPending(Vehicle vehicle) {
        vehicle.setIsVerified(false);
        vehicle.setIsActive(false);
        vehicle.setRejectedAt(null);
        vehicle.setRejectionReason(null);
        vehicle.setApprovedAt(null);
        vehicle.setApprovedBy(null);
    }

    public static void requireImages(Vehicle vehicle) {
        if (vehicle.getVehicleImage() == null || vehicle.getRegistrationImage() == null) {
            throw AppException.badRequest("Vui lòng gửi đủ ảnh xe và ảnh giấy đăng ký xe");
        }
    }

    public static VehicleStatus statusOf(Vehicle v) {
        if (Boolean.TRUE.equals(v.getIsVerified())) {
            return Boolean.TRUE.equals(v.getIsActive()) ? VehicleStatus.ACTIVE : VehicleStatus.INACTIVE;
        }
        return v.getRejectedAt() != null ? VehicleStatus.REJECTED : VehicleStatus.PENDING;
    }

    public static VehicleResponse toResponse(Vehicle v) {
        return VehicleResponse.builder()
            .id(v.getId())
            .driverId(v.getDriverProfile().getId())
            .driverName(v.getDriverProfile().getUser().getFullName())
            .driverPhone(v.getDriverProfile().getUser().getPhone())
            .plateNumber(v.getPlateNumber())
            .vehicleBrand(v.getVehicleBrand())
            .vehicleModel(v.getVehicleModel())
            .vehicleYear(v.getVehicleYear())
            .vehicleColor(v.getVehicleColor())
            .seatCapacity(v.getSeatCapacity())
            .vehicleType(v.getVehicleType())
            .status(statusOf(v))
            .vehicleImage(v.getVehicleImage())
            .registrationImage(v.getRegistrationImage())
            .registrationExpiryDate(v.getRegistrationExpiryDate())
            .isVerified(v.getIsVerified())
            .isActive(v.getIsActive())
            .approvedAt(v.getApprovedAt())
            .approvedBy(v.getApprovedBy())
            .rejectedAt(v.getRejectedAt())
            .rejectionReason(v.getRejectionReason())
            .createdAt(v.getCreatedAt())
            .updatedAt(v.getUpdatedAt())
            .build();
    }
}
