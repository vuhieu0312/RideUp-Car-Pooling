package com.rideup.service;

import com.rideup.exception.AppException;
import com.rideup.dto.request.RegisterVehicleRequest;
import com.rideup.dto.response.DriverResponse;
import com.rideup.dto.response.VehicleResponse;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Vehicle;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
/**
 * Nghiệp vụ phương tiện của tài xế.
 *
 * <p>UC13: Tài xế đăng ký xe. UC17: Admin duyệt xe.</p>
 *
 * <p>Constraint: mỗi tài xế chỉ có TỐI ĐA 1 xe. Đã có xe thì không
 * đăng ký thêm được — phải liên hệ admin.</p>
 */
public class VehicleService {

    VehicleRepository vehicleRepository;
    DriverProfileRepository driverProfileRepository;
    DriverService driverService;
    FileService fileService;

    /**
     * Driver đăng ký xe mới. Yêu cầu driver đã được APPROVED.
     * Xe mới tạo mặc định isVerified=false (chờ admin duyệt).
     */
    @Transactional
    public VehicleResponse registerVehicle(String userId, RegisterVehicleRequest req) {
        DriverProfile driver = driverService.requireApprovedDriver(userId);

        if (vehicleRepository.existsByPlateNumber(req.getPlateNumber())) {
            throw AppException.conflict("Biển số xe đã được đăng ký");
        }
        if (vehicleRepository.findByDriverId(driver.getId()).isPresent()) {
            throw AppException.badRequest("Tài xế đã có xe đăng ký. Vui lòng liên hệ admin để thêm xe mới.");
        }

        Vehicle vehicle = Vehicle.builder()
            .driverId(driver.getId())
            .plateNumber(req.getPlateNumber().toUpperCase())
            .vehicleBrand(req.getVehicleBrand())
            .vehicleModel(req.getVehicleModel())
            .vehicleYear(req.getVehicleYear())
            .vehicleColor(req.getVehicleColor())
            .seatCapacity(req.getSeatCapacity())
            .vehicleType(req.getVehicleType())
            .registrationExpiryDate(req.getRegistrationExpiryDate())
            .insuranceExpiryDate(req.getInsuranceExpiryDate())
            .isVerified(false)
            .isActive(false)
            .build();

        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle registered id={} driverProfile={} plate={}",
            vehicle.getId(), driver.getId(), vehicle.getPlateNumber());
        return toResponse(vehicle);
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listMyVehicles(String userId) {
        DriverProfile driver = driverService.requireApprovedDriver(userId);
        return vehicleRepository.findByDriverId(driver.getId())
            .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listPendingVehicles() {
        return vehicleRepository.findByIsVerified(false).stream()
            .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listVerifiedVehicles() {
        return vehicleRepository.findByIsVerifiedAndIsActive(true, true).stream()
            .map(this::toResponse).toList();
    }

    @Transactional
    public VehicleResponse approve(String vehicleId, String adminUserId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy phương tiện"));
        if (Boolean.TRUE.equals(vehicle.getIsVerified())) {
            throw AppException.badRequest("Phương tiện đã được duyệt trước đó");
        }
        vehicle.setIsVerified(true);
        vehicle.setIsActive(true);
        vehicle.setApprovedAt(LocalDateTime.now());
        vehicle.setApprovedBy(adminUserId);
        vehicle.setRejectedAt(null);
        vehicle.setRejectionReason(null);
        vehicle = vehicleRepository.save(vehicle);
        log.info("Admin {} approved vehicleId={} driverProfile={}",
            adminUserId, vehicle.getId(), vehicle.getDriverId());
        return toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse reject(String vehicleId, String adminUserId, String reason) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy phương tiện"));
        vehicle.setIsVerified(false);
        vehicle.setIsActive(false);
        vehicle.setRejectedAt(LocalDateTime.now());
        vehicle.setRejectionReason(reason);
        vehicle.setApprovedAt(null);
        vehicle.setApprovedBy(null);
        vehicle = vehicleRepository.save(vehicle);
        log.info("Admin {} rejected vehicleId={} reason='{}'", adminUserId, vehicle.getId(), reason);
        return toResponse(vehicle);
    }

    /**
     * Helper cho TripService — lấy xe đã duyệt của driver. Throw nếu không có/không duyệt.
     */
    public Vehicle requireVerifiedVehicle(String driverProfileId) {
        Vehicle v = vehicleRepository.findByDriverId(driverProfileId)
            .orElseThrow(() -> AppException.forbidden("Tài xế chưa đăng ký phương tiện"));
        if (!Boolean.TRUE.equals(v.getIsVerified()) || !Boolean.TRUE.equals(v.getIsActive())) {
            throw AppException.forbidden(
                "Phương tiện chưa được admin duyệt (hiện tại: verified=" + v.getIsVerified() + ")"
            );
        }
        return v;
    }

    public VehicleResponse toResponse(Vehicle v) {
        return VehicleResponse.builder()
            .id(v.getId())
            .driverId(v.getDriverId())
            .plateNumber(v.getPlateNumber())
            .vehicleBrand(v.getVehicleBrand())
            .vehicleModel(v.getVehicleModel())
            .vehicleYear(v.getVehicleYear())
            .vehicleColor(v.getVehicleColor())
            .seatCapacity(v.getSeatCapacity())
            .vehicleType(v.getVehicleType())
            .vehicleImage(v.getVehicleImage())
            .registrationImage(v.getRegistrationImage())
            .registrationExpiryDate(v.getRegistrationExpiryDate())
            .insuranceImage(v.getInsuranceImage())
            .insuranceExpiryDate(v.getInsuranceExpiryDate())
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