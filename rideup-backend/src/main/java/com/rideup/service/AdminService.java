package com.rideup.service;

import com.rideup.exception.AppException;
import com.rideup.dto.response.DriverResponse;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.User;
import com.rideup.enums.DriverStatus;
import com.rideup.repository.DriverProfileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** Nghiệp vụ duyệt/từ chối hồ sơ tài xế. */
@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminService {

    DriverProfileRepository driverProfileRepository;
    MailService mailService;
    RealtimeService realtimeService;

    @Transactional(readOnly = true)
    public List<DriverResponse> listDrivers(DriverStatus status) {
        List<DriverProfile> profiles = (status == null)
            ? driverProfileRepository.findAll()
            : driverProfileRepository.findByStatus(status);
        return profiles.stream().map(this::toResponse).toList();
    }

    @Transactional
    public DriverResponse approve(String driverProfileId, String adminUserId) {
        DriverProfile profile = driverProfileRepository.findById(driverProfileId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ tài xế"));

        if (profile.getStatus() == DriverStatus.APPROVED) {
            throw AppException.badRequest("Hồ sơ đã được duyệt trước đó");
        }

        profile.setStatus(DriverStatus.APPROVED);
        profile.setApprovedAt(LocalDateTime.now());
        profile.setApprovedBy(adminUserId);
        profile.setRejectedAt(null);
        profile.setRejectionReason(null);
        profile = driverProfileRepository.save(profile);

        log.info("Admin {} approved driverProfile={} userId={}",
            adminUserId, profile.getId(), profile.getUser().getId());
        User u = profile.getUser();
        mailService.sendDriverApproved(u.getEmail(), u.getFullName());
        realtimeService.driverProfileChanged(profile);
        return toResponse(profile);
    }

    @Transactional
    public DriverResponse reject(String driverProfileId, String adminUserId, String reason) {
        DriverProfile profile = driverProfileRepository.findById(driverProfileId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ tài xế"));

        if (profile.getStatus() == DriverStatus.REJECTED) {
            throw AppException.badRequest("Hồ sơ đã bị từ chối trước đó");
        }

        profile.setStatus(DriverStatus.REJECTED);
        profile.setRejectedAt(LocalDateTime.now());
        profile.setRejectionReason(reason);
        profile.setApprovedAt(null);
        profile.setApprovedBy(null);
        profile = driverProfileRepository.save(profile);

        log.info("Admin {} rejected driverProfile={} userId={} reason='{}'",
            adminUserId, profile.getId(), profile.getUser().getId(), reason);
        User u = profile.getUser();
        mailService.sendDriverRejected(u.getEmail(), u.getFullName(), reason);
        realtimeService.driverProfileChanged(profile);
        return toResponse(profile);
    }

    private DriverResponse toResponse(DriverProfile p) {
        User u = p.getUser();
        return DriverResponse.builder()
            .id(p.getId())
            .userId(u.getId())
            .fullName(u.getFullName())
            .email(u.getEmail())
            .phone(u.getPhone())
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
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt())
            .build();
    }
}