package com.rideup.service;

import com.rideup.dto.response.DriverDetailResponse;
import com.rideup.dto.response.DriverResponse;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.User;
import com.rideup.entity.Vehicle;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.NotificationType;
import com.rideup.exception.AppException;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.UserRepository;
import com.rideup.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminService {

    DriverProfileRepository driverProfileRepository;
    VehicleRepository vehicleRepository;
    UserRepository userRepository;
    VehicleService vehicleService;
    MailService mailService;
    RealtimeService realtimeService;

    @Transactional(readOnly = true)
    public List<DriverResponse> listDrivers(DriverStatus status) {
        List<DriverProfile> profiles = (status == null)
            ? driverProfileRepository.findAll()
            : driverProfileRepository.findByStatus(status);
        return profiles.stream().map(p -> DriverService.toResponse(p, null)).toList();
    }

    @Transactional(readOnly = true)
    public DriverDetailResponse getDriverDetail(String driverProfileId) {
        DriverProfile profile = requireProfile(driverProfileId);
        List<Vehicle> vehicles = vehicleRepository.findByDriverProfileIdOrderByCreatedAtDesc(profile.getId());
        Vehicle vehicle = vehicleRepository
            .findCurrentVehicle(profile.getId(), profile.getStatus() == DriverStatus.APPROVED)
            .orElse(null);

        return DriverDetailResponse.builder()
            .driver(DriverService.toResponse(profile, null))
            .vehicle(vehicle == null ? null : VehicleService.toResponse(vehicle))
            .vehicles(vehicles.stream().map(VehicleService::toResponse).toList())
            .driverReviewedByName(userName(profile.getApprovedBy()))
            .vehicleReviewedByName(vehicle == null ? null : userName(vehicle.getApprovedBy()))
            .accountCreatedAt(profile.getUser().getCreatedAt())
            .warnings(buildWarnings(profile, vehicle))
            .build();
    }

    @Transactional
    public DriverResponse approve(String driverProfileId, String adminUserId) {
        DriverProfile profile = requireProfile(driverProfileId);
        if (profile.getStatus() == DriverStatus.APPROVED) {
            throw AppException.badRequest("Hồ sơ đã được duyệt trước đó");
        }

        profile.setStatus(DriverStatus.APPROVED);
        profile.setApprovedAt(LocalDateTime.now(TripService.VN_ZONE));
        profile.setApprovedBy(adminUserId);
        profile.setRejectedAt(null);
        profile.setRejectionReason(null);
        profile = driverProfileRepository.save(profile);

        vehicleRepository.findFirstByDriverProfileIdAndIsVerifiedFalseAndRejectedAtIsNull(profile.getId())
            .ifPresent(v -> vehicleService.activate(v, adminUserId));

        log.info("Admin {} approved driverProfile={} userId={}",
            adminUserId, profile.getId(), profile.getUser().getId());
        User u = profile.getUser();
        mailService.sendDriverApproved(u.getEmail(), u.getFullName());
        realtimeService.notifyUser(u, NotificationType.DRIVER_APPROVED, "Hồ sơ tài xế đã được duyệt",
            "Bạn có thể bắt đầu tạo chuyến đi.", null, null, null);
        realtimeService.driverProfileChanged(profile);
        realtimeService.vehicleChanged(u.getId());
        realtimeService.adminQueueChanged();
        return DriverService.toResponse(profile, null);
    }

    @Transactional
    public DriverResponse reject(String driverProfileId, String adminUserId, String reason) {
        DriverProfile profile = requireProfile(driverProfileId);
        if (profile.getStatus() == DriverStatus.REJECTED) {
            throw AppException.badRequest("Hồ sơ đã bị từ chối trước đó");
        }

        profile.setStatus(DriverStatus.REJECTED);
        profile.setRejectedAt(LocalDateTime.now(TripService.VN_ZONE));
        profile.setRejectionReason(reason);
        profile.setApprovedAt(null);
        profile.setApprovedBy(null);
        profile = driverProfileRepository.save(profile);

        vehicleRepository.findFirstByDriverProfileIdAndIsVerifiedFalseAndRejectedAtIsNull(profile.getId())
            .ifPresent(v -> vehicleService.markRejected(v, reason));

        log.info("Admin {} rejected driverProfile={} userId={} reason='{}'",
            adminUserId, profile.getId(), profile.getUser().getId(), reason);
        User u = profile.getUser();
        mailService.sendDriverRejected(u.getEmail(), u.getFullName(), reason);
        realtimeService.notifyUser(u, NotificationType.DRIVER_REJECTED, "Hồ sơ tài xế bị từ chối",
            "Lý do: " + reason + "\nHãy chỉnh sửa và gửi lại hồ sơ.", null, null, null);
        realtimeService.driverProfileChanged(profile);
        realtimeService.vehicleChanged(u.getId());
        realtimeService.adminQueueChanged();
        return DriverService.toResponse(profile, null);
    }

    private DriverProfile requireProfile(String driverProfileId) {
        return driverProfileRepository.findById(driverProfileId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ tài xế"));
    }

    private String userName(String userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    private List<String> buildWarnings(DriverProfile p, Vehicle v) {
        LocalDate today = LocalDate.now(TripService.VN_ZONE);
        List<String> warnings = new ArrayList<>();

        if (p.getStatus() == DriverStatus.PENDING && p.getRejectionReason() != null) {
            warnings.add("Hồ sơ gửi lại, lần trước bị từ chối vì: " + p.getRejectionReason());
        }
        if (p.getCccdImageFront() == null || p.getCccdImageBack() == null || p.getGplxImage() == null) {
            warnings.add("Hồ sơ tài xế thiếu ảnh giấy tờ");
        }
        addExpiryWarning(warnings, "GPLX", p.getGplxExpiryDate(), today);

        LocalDate dob = p.getUser().getDateOfBirth();
        if (dob != null && Period.between(dob, today).getYears() < 18) {
            warnings.add("Tài xế chưa đủ 18 tuổi");
        }

        if (v == null) {
            warnings.add("Tài xế chưa đăng ký phương tiện");
        } else {
            if (v.getVehicleImage() == null || v.getRegistrationImage() == null) {
                warnings.add("Phương tiện thiếu ảnh xe hoặc ảnh giấy đăng ký");
            }
            addExpiryWarning(warnings, "Đăng ký xe", v.getRegistrationExpiryDate(), today);
        }
        return warnings;
    }

    private void addExpiryWarning(List<String> warnings, String label, LocalDate expiry, LocalDate today) {
        if (expiry == null) {
            return;
        }
        if (expiry.isBefore(today)) {
            warnings.add(label + " đã hết hạn từ " + expiry);
        } else if (expiry.isBefore(today.plusDays(30))) {
            warnings.add(label + " sắp hết hạn (" + expiry + ")");
        }
    }
}
