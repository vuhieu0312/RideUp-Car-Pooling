package com.rideup.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateCommissionRequest {
    @NotNull(message = "Phần trăm hoa hồng là bắt buộc")
    @Min(value = 0, message = "Hoa hồng phải từ 0 đến 50%")
    @Max(value = 50, message = "Hoa hồng phải từ 0 đến 50%")
    Integer percent;
}
