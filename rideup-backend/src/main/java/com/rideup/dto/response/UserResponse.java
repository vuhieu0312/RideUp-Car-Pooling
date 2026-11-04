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

// field null thì không có trong JSON (@JsonInclude NON_NULL)
@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    String id;
    String fullName;
    String email;
    // định dạng E.164, vd +84987654321
    String phoneNumber;
    LocalDate dateOfBirth;
    Gender gender;
    String avatarUrl;
    Boolean verified;
    Set<Role> roles;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime lastLoginAt;
    // chỉ có khi user đã đăng ký tài xế
    DriverSummary driver;
}