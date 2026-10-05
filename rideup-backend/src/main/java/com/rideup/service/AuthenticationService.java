package com.rideup.service;

import com.rideup.exception.AppException;
import com.rideup.constant.RedisKey;
import com.rideup.constant.RedisKeyTTL;
import com.rideup.dto.request.LoginRequest;
import com.rideup.dto.request.LogoutRequest;
import com.rideup.dto.request.RefreshRequest;
import com.rideup.dto.request.RegisterRequest;
import com.rideup.dto.response.AuthResponse;
import com.rideup.dto.response.UserResponse;
import com.rideup.entity.RefreshToken;
import com.rideup.entity.User;
import com.rideup.enums.Role;
import com.rideup.repository.RefreshTokenRepository;
import com.rideup.repository.UserRepository;
import com.rideup.security.JwtService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Collections;
import java.util.HashSet;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {

    UserRepository userRepository;
    RefreshTokenRepository refreshTokenRepository;
    JwtService jwtService;
    RedisTemplate<String, Object> redisTemplate;
    PasswordEncoder passwordEncoder;

    @NonFinal
    @Value("${app.jwt.access-token-expiration-ms}")
    long VALID_DURATION;

    @NonFinal
    @Value("${app.jwt.refresh-token-expiration-ms}")
    long REFRESHABLE_DURATION;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw AppException.conflict("Email already in use");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw AppException.conflict("Phone already in use");
        }

        // Endpoint /auth/register dành cho khách — role CUSTOMER hardcode, không cho phép
        // đăng ký driver ở đây (driver phải dùng POST /driver/register riêng).
        Role role = Role.CUSTOMER;

        User user = User.builder()
            .fullName(request.getFullName())
            .email(request.getEmail())
            .phone(request.getPhone())
            .password(passwordEncoder.encode(request.getPassword()))
            .verified(true)
            .roles(new HashSet<>(Collections.singletonList(role)))
            .build();

        userRepository.save(user);
        return issueTokens(user);
    }

    public AuthResponse authenticate(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> AppException.unauthorized("Invalid email or password"));

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!authenticated) throw AppException.unauthorized("Invalid email or password");

        return issueTokens(user);
    }

    @Transactional
    public void logout(LogoutRequest request) {
        if (request == null) return;

        if (request.getAccessToken() != null && !request.getAccessToken().isBlank()) {
            redisTemplate.delete(RedisKey.ACCESS_TOKEN + request.getAccessToken());
        }

        if (request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            String hashed = hashToken(request.getRefreshToken());
            refreshTokenRepository.findByToken(hashed)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
            redisTemplate.delete(RedisKey.REFRESH_TOKEN + hashed);
        }

        log.info("Logout completed");
    }

    @Transactional
    public AuthResponse refreshToken(RefreshRequest request) {
        String hashedToken = hashToken(request.getRefreshToken());

        RefreshToken oldToken = refreshTokenRepository.findByToken(hashedToken)
            .orElseThrow(() -> AppException.unauthorized("Invalid refresh token"));

        if (Boolean.TRUE.equals(oldToken.getRevoked())
            || oldToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw AppException.unauthorized("Refresh token expired or revoked");
        }

        User user = oldToken.getUser();
        oldToken.setRevoked(true);
        refreshTokenRepository.save(oldToken);
        redisTemplate.delete(RedisKey.REFRESH_TOKEN + hashedToken);

        if (request.getAccessToken() != null && !request.getAccessToken().isBlank()) {
            redisTemplate.delete(RedisKey.ACCESS_TOKEN + request.getAccessToken());
        }

        return issueTokens(user);
    }

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupExpiredTokens() {
        refreshTokenRepository.deleteByExpiryDateBefore(LocalDateTime.now());
    }

    // package-private: DriverService cùng package gọi để cấp token sau khi tạo DriverProfile
    AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = UUID.randomUUID().toString();
        String hashedRefreshToken = hashToken(rawRefreshToken);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
            .token(hashedRefreshToken)
            .user(user)
            .expiryDate(LocalDateTime.now().plusSeconds(REFRESHABLE_DURATION / 1000))
            .revoked(false)
            .build();
        refreshTokenRepository.save(refreshTokenEntity);

        String accessKey  = RedisKey.ACCESS_TOKEN  + accessToken;
        String refreshKey = RedisKey.REFRESH_TOKEN + hashedRefreshToken;
        redisTemplate.opsForValue().set(accessKey,  user.getId(), RedisKeyTTL.ACCESS_TOKEN_TTL);
        redisTemplate.opsForValue().set(refreshKey, user.getId(), RedisKeyTTL.REFRESH_TOKEN_TTL);
        log.debug("Tokens saved to Redis");

        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(rawRefreshToken)
            .tokenType("Bearer")
            .expiresIn(VALID_DURATION / 1000)
            .user(UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhone())
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender())
                .avatarUrl(user.getAvatarUrl())
                .verified(user.getVerified())
                .roles(user.getRoles())              // Set<Role> enum, không cần convert String
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build())
            .build();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Cannot hash token", e);
        }
    }
}