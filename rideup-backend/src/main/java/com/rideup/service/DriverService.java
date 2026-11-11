package com.rideup.service;

import com.rideup.dto.request.DriverRegisterRequest;
import com.rideup.dto.request.DriverResubmitRequest;
import com.rideup.dto.response.AuthResponse;
import com.rideup.dto.response.DriverResponse;
import com.rideup.dto.response.DriverStatusResponse;
import com.rideup.dto.response.DriverSummary;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.User;
import com.rideup.entity.Vehicle;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.Role;
import com.rideup.exception.AppException;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.UserRepository;
import com.rideup.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverService {

    UserRepository userRepository;
    DriverProfileRepository driverProfileRepository;
    VehicleRepository vehicleRepository;
    AuthenticationService authenticationService;
    FileService fileService;
    PasswordEncoder passwordEncoder;
    RealtimeService realtimeService;

    @Transactional
    public AuthResponse register(DriverRegisterRequest data,
            MultipartFile cccdImageFront,
            MultipartFile cccdImageBack,
            MultipartFile gplxImage,
            MultipartFile vehicleImage,
            MultipartFile registrationImage) {

        // kiểm tra trùng trước khi upload file để đỡ tốn disk
        ensureEmailAvailable(data.getEmail());
        ensurePhoneAvailable(data.getPhone());
        ensureCccdAvailable(data.getCccd(), null);
        ensureGplxAvailable(data.getGplx(), null);
        String plate = VehicleService.normalizePlate(data.getPlateNumber());
        ensurePlateAvailable(plate, null);

        String cccdFrontUrl = fileService.upload(cccdImageFront, "cccd-front");
        String cccdBackUrl = fileService.upload(cccdImageBack, "cccd-back");
        String gplxUrl = fileService.upload(gplxImage, "gplx");
        String vehicleUrl = fileService.upload(vehicleImage, "vehicle-photo");
        String registrationUrl = fileService.upload(registrationImage, "vehicle-reg");

        User user = userRepository.save(User.builder()
                .fullName(data.getFullName())
                .email(data.getEmail())
                .phone(data.getPhone())
                .dateOfBirth(data.getDateOfBirth())
                .gender(data.getGender())
                .password(passwordEncoder.encode(data.getPassword()))
                .verified(true)
                .roles(Collections.singleton(Role.DRIVER))
                .build());

        DriverProfile profile = driverProfileRepository.save(DriverProfile.builder()
                .user(user)
                .cccd(data.getCccd())
                .cccdImageFront(cccdFrontUrl)
                .cccdImageBack(cccdBackUrl)
                .gplx(data.getGplx())
                .gplxExpiryDate(data.getGplxExpiryDate())
                .gplxImage(gplxUrl)
                .driverRating(BigDecimal.ZERO)
                .totalDriverRides(0)
                .status(DriverStatus.PENDING)
                .build());

        Vehicle vehicle = Vehicle.builder()
                .driverProfile(profile)
                .vehicleImage(vehicleUrl)
                .registrationImage(registrationUrl)
                .build();
        VehicleService.applyFields(vehicle, data, plate);
        VehicleService.markPending(vehicle);
        vehicleRepository.save(vehicle);

        log.info("Driver registered userId={}, driverProfileId={}, cccd={}, plate={}",
                user.getId(), profile.getId(), profile.getCccd(), plate);

        realtimeService.adminQueueChanged();

        AuthResponse resp = authenticationService.issueTokens(user);
        resp.getUser().setDriver(DriverSummary.builder()
                .id(profile.getId())
                .status(profile.getStatus())
                .rating(profile.getDriverRating())
                .totalRides(profile.getTotalDriverRides())
                .build());
        return resp;
    }

    @Transactional
    public DriverResponse resubmit(String userId, DriverResubmitRequest data,
            MultipartFile cccdImageFront,
            MultipartFile cccdImageBack,
            MultipartFile gplxImage,
            MultipartFile vehicleImage,
            MultipartFile registrationImage) {
        DriverProfile profile = requireDriverProfile(userId);
        if (profile.getStatus() != DriverStatus.REJECTED) {
            throw AppException.badRequest("Chỉ được sửa và gửi lại khi hồ sơ bị từ chối");
        }

        User user = profile.getUser();
        if (!data.getPhone().equals(user.getPhone())) {
            ensurePhoneAvailable(data.getPhone());
        }
        ensureCccdAvailable(data.getCccd(), profile.getId());
        ensureGplxAvailable(data.getGplx(), profile.getId());

        Vehicle vehicle = vehicleRepository
                .findFirstByDriverProfileIdAndIsVerifiedFalseOrderByCreatedAtDesc(profile.getId())
                .orElse(null);
        boolean hasActiveVehicle = vehicleRepository
                .findFirstByDriverProfileIdAndIsVerifiedTrueAndIsActiveTrue(profile.getId())
                .isPresent();
        boolean updateVehicle = vehicle != null || !hasActiveVehicle;
        String plate = null;
        if (updateVehicle) {
            requireVehicleInput(data);
            plate = VehicleService.normalizePlate(data.getPlateNumber());
            ensurePlateAvailable(plate, vehicle == null ? null : vehicle.getId());
        }

        if (FileService.hasFile(cccdImageFront)) {
            profile.setCccdImageFront(fileService.upload(cccdImageFront, "cccd-front"));
        }
        if (FileService.hasFile(cccdImageBack)) {
            profile.setCccdImageBack(fileService.upload(cccdImageBack, "cccd-back"));
        }
        if (FileService.hasFile(gplxImage)) {
            profile.setGplxImage(fileService.upload(gplxImage, "gplx"));
        }

        user.setFullName(data.getFullName());
        user.setPhone(data.getPhone());
        user.setDateOfBirth(data.getDateOfBirth());
        user.setGender(data.getGender());
        profile.setCccd(data.getCccd());
        profile.setGplx(data.getGplx());
        profile.setGplxExpiryDate(data.getGplxExpiryDate());
        profile.setStatus(DriverStatus.PENDING);
        userRepository.save(user);
        profile = driverProfileRepository.save(profile);

        if (updateVehicle) {
            if (vehicle == null) {
                vehicle = Vehicle.builder().driverProfile(profile).build();
            }
            VehicleService.applyFields(vehicle, data, plate);
            if (FileService.hasFile(vehicleImage)) {
                vehicle.setVehicleImage(fileService.upload(vehicleImage, "vehicle-photo"));
            }
            if (FileService.hasFile(registrationImage)) {
                vehicle.setRegistrationImage(fileService.upload(registrationImage, "vehicle-reg"));
            }
            VehicleService.requireImages(vehicle);
            VehicleService.markPending(vehicle);
            vehicleRepository.save(vehicle);
        }

        log.info("Driver resubmitted profile driverProfileId={} userId={} vehicleUpdated={}",
                profile.getId(), userId, updateVehicle);
        realtimeService.driverProfileChanged(profile);
        realtimeService.adminQueueChanged();
        return toResponse(profile, vehicleRepository.findCurrentVehicle(profile.getId(), false).orElse(null));
    }

    @Transactional(readOnly = true)
    public DriverResponse getMyProfile(String userId) {
        DriverProfile profile = requireDriverProfile(userId);
        Vehicle vehicle = vehicleRepository
                .findCurrentVehicle(profile.getId(), profile.getStatus() == DriverStatus.APPROVED)
                .orElse(null);
        return toResponse(profile, vehicle);
    }

    public DriverStatusResponse getMyStatus(String userId) {
        DriverProfile profile = requireDriverProfile(userId);

        String message = switch (profile.getStatus()) {
            case PENDING -> "Hồ sơ đang chờ admin xét duyệt";
            case APPROVED -> "Tài khoản tài xế đã được duyệt";
            case REJECTED -> "Hồ sơ bị từ chối"
                    + (profile.getRejectionReason() != null
                            ? ": " + profile.getRejectionReason()
                            : "");
        };

        return DriverStatusResponse.builder()
                .status(profile.getStatus())
                .message(message)
                .rejectionReason(profile.getRejectionReason())
                .build();
    }

    public DriverProfile requireApprovedDriver(String userId) {
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> AppException.forbidden("Tài khoản chưa đăng ký hồ sơ tài xế"));

        if (profile.getStatus() != DriverStatus.APPROVED) {
            throw AppException.forbidden(
                    "Tài khoản tài xế chưa được duyệt (hiện tại: " + profile.getStatus() + ")");
        }
        return profile;
    }

    public static DriverResponse toResponse(DriverProfile p, Vehicle vehicle) {
        User u = p.getUser();
        return DriverResponse.builder()
                .id(p.getId())
                .userId(u.getId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .avatarUrl(u.getAvatarUrl())
                .dateOfBirth(u.getDateOfBirth())
                .gender(u.getGender())
                .cccd(p.getCccd())
                .cccdImageFront(p.getCccdImageFront())
                .cccdImageBack(p.getCccdImageBack())
                .gplx(p.getGplx())
                .gplxExpiryDate(p.getGplxExpiryDate())
                .gplxImage(p.getGplxImage())
                .driverRating(p.getDriverRating())
                .totalDriverRides(p.getTotalDriverRides())
                .status(p.getStatus())
                .approvedAt(p.getApprovedAt())
                .approvedBy(p.getApprovedBy())
                .rejectedAt(p.getRejectedAt())
                .rejectionReason(p.getRejectionReason())
                .vehicle(vehicle == null ? null : VehicleService.toResponse(vehicle))
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private DriverProfile requireDriverProfile(String userId) {
        return driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Chưa đăng ký hồ sơ tài xế"));
    }

    private void requireVehicleInput(DriverResubmitRequest data) {
        if (data.getPlateNumber() == null || data.getPlateNumber().isBlank()
                || data.getSeatCapacity() == null || data.getVehicleType() == null) {
            throw AppException.badRequest("Vui lòng nhập đủ thông tin xe (biển số, loại xe, số chỗ)");
        }
    }

    private void ensureEmailAvailable(String email) {
        if (userRepository.existsByEmail(email)) {
            throw AppException.conflict("Email đã được đăng ký");
        }
    }

    private void ensurePhoneAvailable(String phone) {
        if (userRepository.existsByPhone(phone)) {
            throw AppException.conflict("Số điện thoại đã được đăng ký");
        }
    }

    private void ensureCccdAvailable(String cccd, String excludeProfileId) {
        boolean taken = excludeProfileId == null
                ? driverProfileRepository.existsByCccd(cccd)
                : driverProfileRepository.existsByCccdAndIdNot(cccd, excludeProfileId);
        if (taken) {
            throw AppException.conflict("CCCD đã được đăng ký bởi tài xế khác");
        }
    }

    private void ensureGplxAvailable(String gplx, String excludeProfileId) {
        boolean taken = excludeProfileId == null
                ? driverProfileRepository.existsByGplx(gplx)
                : driverProfileRepository.existsByGplxAndIdNot(gplx, excludeProfileId);
        if (taken) {
            throw AppException.conflict("GPLX đã được đăng ký bởi tài xế khác");
        }
    }

    private void ensurePlateAvailable(String plate, String excludeVehicleId) {
        if (vehicleRepository.existsLivePlate(plate, excludeVehicleId)) {
            throw AppException.conflict(VehicleService.PLATE_TAKEN);
        }
    }
}
