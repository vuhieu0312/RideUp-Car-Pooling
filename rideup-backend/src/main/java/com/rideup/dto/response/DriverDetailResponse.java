package com.rideup.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverDetailResponse {
    DriverResponse driver;
    VehicleResponse vehicle;
    List<VehicleResponse> vehicles;
    String driverReviewedByName;
    String vehicleReviewedByName;
    LocalDateTime accountCreatedAt;
    List<String> warnings;
}
