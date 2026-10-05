package com.rideup.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateTripRequest {

    @NotBlank
    String startProvinceId;

    @NotBlank
    String endProvinceId;

    /**
     * Danh sách điểm dừng của chuyến (pickup / dropoff).
     * Mỗi item có stopType (PICKUP|DROPOFF), wardId (bắt buộc), addressText (optional).
     * Backend tạo 1 TripStop record cho mỗi item.
     */
    @Valid
    List<TripStopRequest> stops;

    /** Deprecated - dùng stops[] thay. */
    @Deprecated
    String startWardId;

    /** Deprecated - dùng stops[] thay. */
    @Deprecated
    String endWardId;

    @Size(max = 500)
    String startAddressText;

    Double pickupLat;
    Double pickupLng;

    @Size(max = 500)
    String endAddressText;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Future
    LocalDateTime departureTime;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    LocalDateTime estimatedArrivalTime;

    @NotNull
    @Min(1)
    Integer seatTotal;

    @NotNull
    @DecimalMin("0.0")
    BigDecimal priceVnd;

    @Size(max = 1000)
    String note;
}