package com.rideup.controller;

import com.rideup.dto.request.RegisterVehicleRequest;
import com.rideup.dto.response.VehicleResponse;
import com.rideup.exception.ApiResponse;
import com.rideup.service.VehicleService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/driver/vehicles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('DRIVER')")
public class VehicleController {

    VehicleService vehicleService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<VehicleResponse> register(
        @Valid @ModelAttribute RegisterVehicleRequest req,
        @RequestParam("vehicleImage") MultipartFile vehicleImage,
        @RequestParam("registrationImage") MultipartFile registrationImage,
        Authentication auth
    ) {
        String userId = currentUserId(auth);
        return ApiResponse.success(
            "Đăng ký xe thành công, đang chờ admin duyệt",
            vehicleService.registerVehicle(userId, req, vehicleImage, registrationImage)
        );
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<VehicleResponse> resubmit(
        @PathVariable("id") String vehicleId,
        @Valid @ModelAttribute RegisterVehicleRequest req,
        @RequestParam(value = "vehicleImage", required = false) MultipartFile vehicleImage,
        @RequestParam(value = "registrationImage", required = false) MultipartFile registrationImage,
        Authentication auth
    ) {
        String userId = currentUserId(auth);
        return ApiResponse.success(
            "Đã gửi lại hồ sơ xe, đang chờ admin duyệt",
            vehicleService.resubmitVehicle(userId, vehicleId, req, vehicleImage, registrationImage)
        );
    }

    @PutMapping("/{id}/deactivate")
    public ApiResponse<VehicleResponse> deactivate(
        @PathVariable("id") String vehicleId,
        Authentication auth
    ) {
        return ApiResponse.success(
            "Đã ngừng dùng xe",
            vehicleService.deactivate(currentUserId(auth), vehicleId)
        );
    }

    @PutMapping("/{id}/reuse")
    public ApiResponse<VehicleResponse> requestReuse(
        @PathVariable("id") String vehicleId,
        Authentication auth
    ) {
        return ApiResponse.success(
            "Đã gửi yêu cầu dùng lại xe, đang chờ admin duyệt",
            vehicleService.requestReuse(currentUserId(auth), vehicleId)
        );
    }

    @GetMapping
    public ApiResponse<List<VehicleResponse>> listMine(Authentication auth) {
        return ApiResponse.success(vehicleService.listMyVehicles(currentUserId(auth)));
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}