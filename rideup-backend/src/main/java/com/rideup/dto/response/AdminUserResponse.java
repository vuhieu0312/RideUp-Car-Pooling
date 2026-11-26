package com.rideup.dto.response;

import com.rideup.enums.AccountStatus;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.Gender;
import com.rideup.enums.Role;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AdminUserResponse {
    String id;
    String fullName;
    String email;
    String phone;
    LocalDate dateOfBirth;
    Gender gender;
    String avatarUrl;
    Role role;
    AccountStatus accountStatus;
    Integer violationCount;
    DriverStatus driverStatus;
    BigDecimal driverRating;
    Integer totalDriverRides;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
