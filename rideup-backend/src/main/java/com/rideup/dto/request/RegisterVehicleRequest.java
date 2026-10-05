package com.rideup.dto.request;

import com.rideup.enums.VehicleType;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RegisterVehicleRequest {

    @NotBlank
    @Size(min = 7, max = 20)
    String plateNumber;

    @Size(max = 100)
    String vehicleBrand;

    @Size(max = 100)
    String vehicleModel;

    Integer vehicleYear;

    @Size(max = 50)
    String vehicleColor;

    @NotNull
    @Min(2)
    Integer seatCapacity;

    @NotNull
    VehicleType vehicleType;

    LocalDate registrationExpiryDate;

    LocalDate insuranceExpiryDate;
}