package com.rideup.dto.request;

import com.rideup.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RegisterRequest {

    @NotBlank
    @Size(min = 2, max = 150)
    String fullName;

    @NotBlank
    @Email
    String email;

    @NotBlank
    @Size(min = 6, max = 100)
    String password;

    @NotBlank
    @Size(min = 9, max = 20)
    String phone;

    @NotNull
    Role role;
}
