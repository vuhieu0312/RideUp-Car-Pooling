package com.rideup.service;

import com.rideup.dto.request.ChangePasswordRequest;
import com.rideup.dto.request.UpdateProfileRequest;
import com.rideup.dto.response.DriverSummary;
import com.rideup.dto.response.UserResponse;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.User;
import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Nghiệp vụ liên quan tới user tự quản lý (xem/sửa profile, đổi mật khẩu, upload avatar).
 * Mọi method đều nhận userId từ controller (lấy qua {@code Authentication}) — không nhận từ client.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {

    UserRepository userRepository;
    FileService fileService;
    PasswordEncoder passwordEncoder;

    public UserResponse getMyProfile(String userId) {
        User user = getUser(userId);
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateMyProfile(String userId, UpdateProfileRequest req) {
        User user = getUser(userId);

        if (req.getFullName() != null) {
            user.setFullName(req.getFullName());
        }
        if (req.getPhone() != null && !req.getPhone().equals(user.getPhone())) {
            if (userRepository.existsByPhoneAndIdNot(req.getPhone(), userId)) {
                throw new AppException(ErrorCode.PHONE_EXISTED);
            }
            user.setPhone(req.getPhone());
        }
        if (req.getDateOfBirth() != null) {
            user.setDateOfBirth(req.getDateOfBirth());
        }
        if (req.getGender() != null) {
            user.setGender(req.getGender());
        }

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest req) {
        User user = getUser(userId);

        if (!passwordEncoder.matches(req.getOldPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.PASSWORD_NOT_CORRECT);
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public UserResponse updateAvatar(String userId, MultipartFile avatar) {
        User user = getUser(userId);
        String url = fileService.upload(avatar, "avatar");
        user.setAvatarUrl(url);
        return toResponse(userRepository.save(user));
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy người dùng"));
    }

    private UserResponse toResponse(User user) {
        UserResponse.UserResponseBuilder builder = UserResponse.builder()
            .id(user.getId())
            .fullName(user.getFullName())
            .email(user.getEmail())
            .phoneNumber(user.getPhone())
            .dateOfBirth(user.getDateOfBirth())
            .gender(user.getGender())
            .avatarUrl(user.getAvatarUrl())
            .verified(user.getVerified())
            .roles(user.getRoles())
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .lastLoginAt(user.getLastLoginAt());

        // Nếu user đã đăng ký làm driver, gắn kèm DriverSummary cho FE
        DriverProfile profile = user.getDriverProfile();
        if (profile != null) {
            builder.driver(DriverSummary.builder()
                .id(profile.getId())
                .status(profile.getStatus())
                .rating(profile.getDriverRating())
                .totalRides(profile.getTotalDriverRides())
                .approvedAt(profile.getApprovedAt())
                .rejectionReason(profile.getRejectionReason())
                .build());
        }
        return builder.build();
    }
}
