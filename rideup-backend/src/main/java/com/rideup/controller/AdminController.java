package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.DriverRejectRequest;
import com.rideup.dto.response.DriverResponse;
import com.rideup.dto.response.VehicleResponse;
import com.rideup.enums.DriverStatus;
import com.rideup.service.AdminService;
import com.rideup.service.VehicleService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin endpoints — yêu cầu role=ADMIN (class-level @PreAuthorize).
 *
 * <p>Approve driver: KHÔNG gọi {@code driverProfile.setUser(approver)} —
 * approver là admin, driverProfile.user phải luôn trỏ về driver.</p>
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    AdminService adminService;
    VehicleService vehicleService;

    @GetMapping("/drivers")
    public ApiResponse<List<DriverResponse>> listDrivers(
        @RequestParam(required = false) DriverStatus status
    ) {
        return ApiResponse.success(adminService.listDrivers(status));
    }

    // ===== Vehicle management =====

    @GetMapping("/vehicles/pending")
    public ApiResponse<List<VehicleResponse>> listPendingVehicles() {
        return ApiResponse.success(vehicleService.listPendingVehicles());
    }

    @PostMapping("/vehicles/{id}/approve")
    public ApiResponse<VehicleResponse> approveVehicle(
        @PathVariable("id") String vehicleId,
        Authentication auth
    ) {
        String adminId = currentUserId(auth);
        return ApiResponse.success(
            "Đã duyệt phương tiện",
            vehicleService.approve(vehicleId, adminId)
        );
    }

    @PostMapping("/vehicles/{id}/reject")
    public ApiResponse<VehicleResponse> rejectVehicle(
        @PathVariable("id") String vehicleId,
        @Valid @RequestBody com.rideup.dto.request.VehicleRejectRequest req,
        Authentication auth
    ) {
        String adminId = currentUserId(auth);
        return ApiResponse.success(
            "Đã từ chối phương tiện",
            vehicleService.reject(vehicleId, adminId, req.getReason())
        );
    }

    @PostMapping("/drivers/{id}/approve")
    public ApiResponse<DriverResponse> approve(
        @PathVariable("id") String driverProfileId,
        Authentication auth
    ) {
        String adminId = currentUserId(auth);
        return ApiResponse.success(
            "Đã duyệt tài xế",
            adminService.approve(driverProfileId, adminId)
        );
    }

    @PostMapping("/drivers/{id}/reject")
    public ApiResponse<DriverResponse> reject(
        @PathVariable("id") String driverProfileId,
        @Valid @RequestBody DriverRejectRequest req,
        Authentication auth
    ) {
        String adminId = currentUserId(auth);
        return ApiResponse.success(
            "Đã từ chối tài xế",
            adminService.reject(driverProfileId, adminId, req.getReason())
        );
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}