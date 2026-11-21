package com.rideup.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateDebtLimitRequest {
    @NotNull(message = "Hạn mức nợ là bắt buộc")
    @Min(value = 0, message = "Hạn mức nợ phải từ 0 đến 10.000.000 đ")
    @Max(value = 10_000_000, message = "Hạn mức nợ phải từ 0 đến 10.000.000 đ")
    Long limit;
}
