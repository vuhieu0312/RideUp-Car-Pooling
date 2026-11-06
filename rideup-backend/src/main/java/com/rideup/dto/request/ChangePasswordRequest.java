package com.rideup.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

// confirmNewPassword chỉ check ở client, backend không bắt buộc khớp
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChangePasswordRequest {

    @NotBlank(message = "Mật khẩu hiện tại không được trống")
    String oldPassword;

    @NotBlank(message = "Mật khẩu mới không được trống")
    @Size(min = 6, max = 100, message = "Mật khẩu mới phải từ 6 đến 100 ký tự")
    String newPassword;
}
