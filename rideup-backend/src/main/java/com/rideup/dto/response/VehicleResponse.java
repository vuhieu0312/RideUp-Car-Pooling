package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.enums.VehicleType;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VehicleResponse {
    String id;
    String driverId;
    String plateNumber;
    String vehicleBrand;
    String vehicleModel;
    Integer vehicleYear;
    String vehicleColor;
    Integer seatCapacity;
    VehicleType vehicleType;
    String vehicleImage;
    String registrationImage;
    LocalDate registrationExpiryDate;
    String insuranceImage;
    LocalDate insuranceExpiryDate;
    Boolean isVerified;
    Boolean isActive;
    LocalDateTime approvedAt;
    String approvedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}