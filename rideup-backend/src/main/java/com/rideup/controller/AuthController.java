package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.LoginRequest;
import com.rideup.dto.request.LogoutRequest;
import com.rideup.dto.request.RefreshRequest;
import com.rideup.dto.request.RegisterRequest;
import com.rideup.dto.response.AuthResponse;
import com.rideup.service.AuthenticationService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {

    AuthenticationService authenticationService;

    @PostMapping("/register")
    public ApiResponse<AuthResponse> registerAccount(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success("Registered", authenticationService.register(request));
    }

    @PostMapping("/authentication")
    public ApiResponse<AuthResponse> authenticate(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success("Login successful", authenticationService.authenticate(request));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authenticationService.logout(request);
        return ApiResponse.success("Logged out", null);
    }

    @PostMapping("/refresh-token")
    public ApiResponse<AuthResponse> refreshToken(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.success("Token refreshed", authenticationService.refreshToken(request));
    }
}
