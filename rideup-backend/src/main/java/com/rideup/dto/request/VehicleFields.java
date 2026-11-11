package com.rideup.dto.request;

import com.rideup.enums.VehicleType;

import java.time.LocalDate;

public interface VehicleFields {
    String getPlateNumber();

    String getVehicleBrand();

    String getVehicleModel();

    Integer getVehicleYear();

    String getVehicleColor();

    Integer getSeatCapacity();

    VehicleType getVehicleType();

    LocalDate getRegistrationExpiryDate();
}
