package com.rideup.dto.request;

import com.rideup.enums.StopType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripStopRequest {

    @NotNull(message = "Stop type is required")
    StopType stopType;

    @NotBlank(message = "Ward is required")
    String wardId;

    String addressText;
}