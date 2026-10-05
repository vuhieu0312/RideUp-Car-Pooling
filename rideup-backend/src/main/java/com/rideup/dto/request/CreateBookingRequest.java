package com.rideup.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateBookingRequest {

    @NotBlank
    String tripId;

    @Min(1)
    Integer seatCount;

    @Size(max = 500)
    String pickupAddressText;

    Double pickupLat;
    Double pickupLng;

    @Size(max = 500)
    String dropoffAddressText;

    Double dropoffLat;
    Double dropoffLng;

    @Size(max = 1000)
    String note;
}