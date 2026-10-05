package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.DriverRegisterRequest;
import com.rideup.dto.response.AuthResponse;
import com.rideup.dto.response.DriverResponse;
import com.rideup.dto.response.DriverStatusResponse;
import com.rideup.service.DriverService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Endpoint cho app tài xế.
 *
 * <p>Public:</p>
 * <ul>
 *   <li>POST /api/driver/register — đăng ký hồ sơ (multipart)</li>
 * </ul>
 *
 * <p>Cần JWT (driver app sau khi login):</p>
 * <ul>
 *   <li>GET /api/driver/me — toàn bộ profile + trạng thái duyệt</li>
 *   <li>GET /api/driver/status — chỉ status + message (poll nhẹ)</li>
 * </ul>
 *
 * <p>Driver-only (POST /api/driver/vehicles, PATCH /api/driver/me, ...) PHẢI
 * gọi {@code driverService.requireApprovedDriver(userId)} ở đầu method để chặn
 * driver chưa được admin duyệt.</p>
 */
@RestController
@RequestMapping("/driver")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverController {

    DriverService driverService;

    @PostMapping(
        value = "/register",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ApiResponse<AuthResponse> register(
        @Valid @ModelAttribute DriverRegisterRequest data,
        @RequestParam("cccdImageFront") MultipartFile cccdImageFront,
        @RequestParam("cccdImageBack")  MultipartFile cccdImageBack,
        @RequestParam("gplxImage")      MultipartFile gplxImage
    ) {
        AuthResponse auth = driverService.register(
            data, cccdImageFront, cccdImageBack, gplxImage
        );
        return ApiResponse.success("Đăng ký tài xế thành công, đang chờ admin duyệt", auth);
    }

    @GetMapping("/me")
    public ApiResponse<DriverResponse> getMyProfile(Authentication auth) {
        String userId = currentUserId(auth);
        return ApiResponse.success(driverService.getMyProfile(userId));
    }

    @GetMapping("/status")
    public ApiResponse<DriverStatusResponse> getMyStatus(Authentication auth) {
        String userId = currentUserId(auth);
        return ApiResponse.success(driverService.getMyStatus(userId));
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}