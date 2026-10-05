package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.RegisterVehicleRequest;
import com.rideup.dto.response.VehicleResponse;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Vehicle endpoints — chỉ dành cho tài xế (DRIVER).
 * Customer và Admin không thể truy cập.
 */
@RestController
@RequestMapping("/driver/vehicles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('DRIVER')")
public class VehicleController {

    VehicleService vehicleService;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<VehicleResponse> register(
        @Valid @RequestBody RegisterVehicleRequest req,
        Authentication auth
    ) {
        String userId = currentUserId(auth);
        return ApiResponse.success(
            "Đăng ký xe thành công, đang chờ admin duyệt",
            vehicleService.registerVehicle(userId, req)
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