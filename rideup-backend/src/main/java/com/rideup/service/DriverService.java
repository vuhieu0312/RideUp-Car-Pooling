package com.rideup.service;

import com.rideup.exception.AppException;
import com.rideup.dto.request.DriverRegisterRequest;
import com.rideup.dto.response.AuthResponse;
import com.rideup.dto.response.DriverResponse;
import com.rideup.dto.response.DriverStatusResponse;
import com.rideup.dto.response.DriverSummary;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.User;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.Role;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverService {

    UserRepository userRepository;
    DriverProfileRepository driverProfileRepository;
    AuthenticationService authenticationService;
    FileService fileService;
    PasswordEncoder passwordEncoder;

    public AuthResponse register(DriverRegisterRequest data,
            MultipartFile cccdImageFront,
            MultipartFile cccdImageBack,
            MultipartFile gplxImage) {

        // 1. Validate trùng trước khi upload file (tránh tốn disk nếu invalid)
        ensureEmailAvailable(data.getEmail());
        ensurePhoneAvailable(data.getPhone());
        ensureCccdAvailable(data.getCccd());
        ensureGplxAvailable(data.getGplx());

        // 2. Upload 3 file
        String cccdFrontUrl = fileService.upload(cccdImageFront, "cccd-front");
        String cccdBackUrl = fileService.upload(cccdImageBack, "cccd-back");
        String gplxUrl = fileService.upload(gplxImage, "gplx");

        // 3. Tạo User + DriverProfile
        return persistAndIssue(data, cccdFrontUrl, cccdBackUrl, gplxUrl);
    }

    @Transactional
    protected AuthResponse persistAndIssue(DriverRegisterRequest data,
            String cccdFrontUrl,
            String cccdBackUrl,
            String gplxUrl) {
        User user = User.builder()
                .fullName(data.getFullName())
                .email(data.getEmail())
                .phone(data.getPhone())
                .password(passwordEncoder.encode(data.getPassword()))
                .verified(true)
                .roles(Collections.singleton(Role.DRIVER))
                .build();

        user = userRepository.save(user);

        DriverProfile profile = DriverProfile.builder()
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
                .build();

        profile = driverProfileRepository.save(profile);
        log.info("Driver registered userId={}, driverProfileId={}, cccd={}",
                user.getId(), profile.getId(), profile.getCccd());

        // Cấp token + gắn driver summary để frontend route đúng
        AuthResponse resp = authenticationService.issueTokens(user);
        resp.getUser().setDriver(DriverSummary.builder()
                .id(profile.getId())
                .status(profile.getStatus())
                .rating(profile.getDriverRating())
                .totalRides(profile.getTotalDriverRides())
                .build());

        return resp;
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

    private void ensureCccdAvailable(String cccd) {
        if (driverProfileRepository.existsByCccd(cccd)) {
            throw AppException.conflict("CCCD đã được đăng ký bởi tài xế khác");
        }
    }

    private void ensureGplxAvailable(String gplx) {
        if (driverProfileRepository.existsByGplx(gplx)) {
            throw AppException.conflict("GPLX đã được đăng ký bởi tài xế khác");
        }
    }

    // ========== Driver tự xem thông tin ==========

    /**
     * Trả về toàn bộ DriverProfile của user hiện tại (kèm status duyệt).
     * Hoạt động ở mọi trạng thái PENDING/APPROVED/REJECTED để driver
     * có thể check trạng thái sau khi đăng ký.
     */
    @Transactional(readOnly = true)
    public DriverResponse getMyProfile(String userId) {
        DriverProfile profile = requireDriverProfile(userId);
        User user = profile.getUser();

        return DriverResponse.builder()
                .id(profile.getId())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .cccd(profile.getCccd())
                .cccdImageFront(profile.getCccdImageFront())
                .cccdImageBack(profile.getCccdImageBack())
                .gplx(profile.getGplx())
                .gplxExpiryDate(profile.getGplxExpiryDate())
                .gplxImage(profile.getGplxImage())
                .driverRating(profile.getDriverRating())
                .totalDriverRides(profile.getTotalDriverRides())
                .status(profile.getStatus())
                .approvedAt(profile.getApprovedAt())
                .approvedBy(profile.getApprovedBy())
                .rejectedAt(profile.getRejectedAt())
                .rejectionReason(profile.getRejectionReason())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }

    /**
     * Endpoint nhẹ cho driver app poll trạng thái duyệt.
     * Trả message tiếng Việt đã format sẵn, kèm rejectionReason nếu có.
     */
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

    /**
     * Helper cho mọi endpoint driver-only (POST /trips, POST /vehicles, accept
     * booking, ...)
     * Gọi ở đầu method → throw 403 nếu driver chưa được admin duyệt.
     * Đây là cách thực thi "cách B": driver có thể login + xem status,
     * nhưng KHÔNG dùng được driver features cho đến khi APPROVED.
     */
    public DriverProfile requireApprovedDriver(String userId) {
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> AppException.forbidden("Tài khoản chưa đăng ký hồ sơ tài xế"));

        if (profile.getStatus() != DriverStatus.APPROVED) {
            throw AppException.forbidden(
                    "Tài khoản tài xế chưa được duyệt (hiện tại: " + profile.getStatus() + ")");
        }
        return profile;
    }

    private DriverProfile requireDriverProfile(String userId) {
        return driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Chưa đăng ký hồ sơ tài xế"));
    }
}