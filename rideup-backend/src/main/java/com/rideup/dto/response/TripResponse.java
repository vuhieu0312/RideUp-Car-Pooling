package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.enums.TripStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TripResponse {
    String id;
    String routeId;
    String driverId;
    String vehicleId;
    String startProvinceId;
    String endProvinceId;
    String startAddressText;
    String endAddressText;
    LocalDateTime departureTime;
    LocalDateTime estimatedArrivalTime;
    Integer seatTotal;
    Integer seatAvailable;
    BigDecimal priceVnd;
    TripStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String note;

    List<TripStopResponse> stops;

    String driverName;
    String driverEmail;
    String driverPhone;
    String avatarUrl;
    Double driverRating;

    String vehicleImage;
    String vehicleBrand;
    String vehicleModel;
}