package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.enums.Gender;
import com.rideup.enums.Role;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * Response chuẩn cho mọi endpoint trả về thông tin user.
 * Dùng cho: login, register, get profile, get user by id, ...
 *
 * Field nào null sẽ bị ẩn khỏi JSON (Nhờ @JsonInclude(NON_NULL)) — FE không cần check null thừa.
 */
@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    String id;
    String fullName;
    String email;
    /** E.164 format, vd: +84987654321 */
    String phoneNumber;
    LocalDate dateOfBirth;
    Gender gender;
    String avatarUrl;
    Boolean verified;
    /** Enum Set — type-safe, FE có thể dùng trực tiếp user.roles.includes(Role.ADMIN) */
    Set<Role> roles;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime lastLoginAt;
    /** Chỉ có khi user đã đăng ký làm driver. null với customer/admin thuần. */
    DriverSummary driver;
}