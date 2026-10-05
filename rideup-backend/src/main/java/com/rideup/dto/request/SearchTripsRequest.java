package com.rideup.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SearchTripsRequest {

    @NotBlank
    String startProvinceId;

    @NotBlank
    String startWardId;

    @NotBlank
    String endProvinceId;

    @NotBlank
    String endWardId;

    @NotNull
    LocalDate departureDate;
}