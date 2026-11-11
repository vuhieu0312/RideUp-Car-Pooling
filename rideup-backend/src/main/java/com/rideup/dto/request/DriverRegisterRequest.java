package com.rideup.dto.request;

import com.rideup.enums.Gender;
import com.rideup.enums.VehicleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

// role DRIVER do server tự gán, không nhận từ request
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverRegisterRequest implements VehicleFields {

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

    @NotNull
    @Past(message = "Ngày sinh không hợp lệ")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    LocalDate dateOfBirth;

    @NotNull
    Gender gender;

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

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    LocalDate registrationExpiryDate;
}
