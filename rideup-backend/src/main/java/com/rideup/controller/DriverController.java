package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.DriverRegisterRequest;
import com.rideup.dto.request.DriverResubmitRequest;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
        @RequestParam("gplxImage")      MultipartFile gplxImage,
        @RequestParam("vehicleImage")   MultipartFile vehicleImage,
        @RequestParam("registrationImage") MultipartFile registrationImage
    ) {
        AuthResponse auth = driverService.register(
            data, cccdImageFront, cccdImageBack, gplxImage, vehicleImage, registrationImage
        );
        return ApiResponse.success("Đăng ký tài xế thành công, đang chờ admin duyệt", auth);
    }

    @PutMapping(
        value = "/profile",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ApiResponse<DriverResponse> resubmit(
        @Valid @ModelAttribute DriverResubmitRequest data,
        @RequestParam(value = "cccdImageFront", required = false) MultipartFile cccdImageFront,
        @RequestParam(value = "cccdImageBack", required = false) MultipartFile cccdImageBack,
        @RequestParam(value = "gplxImage", required = false) MultipartFile gplxImage,
        @RequestParam(value = "vehicleImage", required = false) MultipartFile vehicleImage,
        @RequestParam(value = "registrationImage", required = false) MultipartFile registrationImage,
        Authentication auth
    ) {
        String userId = currentUserId(auth);
        return ApiResponse.success(
            "Đã gửi lại hồ sơ, đang chờ admin duyệt",
            driverService.resubmit(userId, data, cccdImageFront, cccdImageBack, gplxImage,
                vehicleImage, registrationImage)
        );
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