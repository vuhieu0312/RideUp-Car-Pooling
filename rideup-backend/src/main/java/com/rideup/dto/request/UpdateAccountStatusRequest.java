package com.rideup.dto.request;

import com.rideup.enums.AccountStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateAccountStatusRequest {
    @NotNull(message = "Trạng thái tài khoản là bắt buộc")
    AccountStatus status;
}
