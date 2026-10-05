package com.rideup.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * Form fields cho POST /driver/register (multipart/form-data).
 * Đi cùng 3 MultipartFile: cccdImageFront, cccdImageBack, gplxImage.
 * Role DRIVER được hardcode server-side, không nhận từ request.
 */
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverRegisterRequest {

    // ===== User fields =====
    @NotBlank
    @Size(min = 2, max = 150)
    String fullName;

    @NotBlank
    @Email
    String email;

    @NotBlank
    @Size(min = 8, max = 100)
    String password;

    @NotBlank
    @Pattern(regexp = "^(0\\d{9}|\\+84\\d{9,10})$", message = "Số điện thoại không hợp lệ")
    String phone;

    // ===== Driver-specific fields =====
    @NotBlank
    @Pattern(regexp = "^\\d{12}$", message = "CCCD phải đúng 12 số")
    String cccd;

    @NotBlank
    @Size(min = 8, max = 20)
    String gplx;

    @NotNull
    @Future(message = "Ngày hết hạn GPLX phải sau hôm nay")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    LocalDate gplxExpiryDate;
}