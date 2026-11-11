package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.Gender;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DriverResponse {
    String id;
    String userId;
    String fullName;
    String email;
    String phone;
    String avatarUrl;
    LocalDate dateOfBirth;
    Gender gender;

    String cccd;
    String cccdImageFront;
    String cccdImageBack;
    String gplx;
    LocalDate gplxExpiryDate;
    String gplxImage;

    BigDecimal driverRating;
    Integer totalDriverRides;

    DriverStatus status;
    LocalDateTime approvedAt;
    String approvedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    VehicleResponse vehicle;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}