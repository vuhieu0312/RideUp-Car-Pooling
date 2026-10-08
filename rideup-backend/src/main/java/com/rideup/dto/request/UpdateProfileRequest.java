package com.rideup.dto.request;

import com.rideup.enums.Gender;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

/**
 * Body cho PATCH /users/me — user tự sửa thông tin cá nhân.
 * Email không có ở đây vì là login key, không cho đổi qua endpoint này.
 * Field nào null sẽ được giữ nguyên (partial update).
 */
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateProfileRequest {

    @Size(min = 2, max = 150, message = "Họ tên phải từ 2 đến 150 ký tự")
    String fullName;

    @Pattern(regexp = "^(0|\\+84)[0-9]{9,11}$", message = "Số điện thoại không hợp lệ")
    String phone;

    @PastOrPresent(message = "Ngày sinh không hợp lệ")
    LocalDate dateOfBirth;

    Gender gender;
}
