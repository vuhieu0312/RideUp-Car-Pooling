package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.DriverRejectRequest;
import com.rideup.dto.request.UpdateAccountStatusRequest;
import com.rideup.dto.request.UpdateCommissionRequest;
import com.rideup.dto.request.UpdateDebtLimitRequest;
import com.rideup.dto.response.AdminUserResponse;
import com.rideup.dto.response.DriverDetailResponse;
import com.rideup.dto.response.DriverResponse;
import com.rideup.dto.response.VehicleResponse;
import com.rideup.dto.response.AdminDashboardStats;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.Role;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    AdminService adminService;
    VehicleService vehicleService;

    @GetMapping("/stats")
    public ApiResponse<AdminDashboardStats> stats() {
        return ApiResponse.success(adminService.getDashboardStats());
    }

    @GetMapping("/drivers")
    public ApiResponse<List<DriverResponse>> listDrivers(
        @RequestParam(required = false) DriverStatus status
    ) {
        return ApiResponse.success(adminService.listDrivers(status));
    }

    @GetMapping("/users")
    public ApiResponse<List<AdminUserResponse>> listUsers(@RequestParam Role role) {
        return ApiResponse.success(adminService.listManagedUsers(role));
    }

    @GetMapping("/users/{id}")
    public ApiResponse<AdminUserResponse> getUser(@PathVariable("id") String userId) {
        return ApiResponse.success(adminService.getManagedUser(userId));
    }

    @PatchMapping("/users/{id}/status")
    public ApiResponse<AdminUserResponse> updateUserStatus(
        @PathVariable("id") String userId,
        @Valid @RequestBody UpdateAccountStatusRequest req,
        Authentication auth
    ) {
        adminService.updateAccountStatus(userId, req.getStatus(), currentUserId(auth));
        return ApiResponse.success("Đã cập nhật trạng thái tài khoản", adminService.getManagedUser(userId));
    }


    @GetMapping("/drivers/{id}")
    public ApiResponse<DriverDetailResponse> getDriverDetail(@PathVariable("id") String driverProfileId) {
        return ApiResponse.success(adminService.getDriverDetail(driverProfileId));
    }

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

    @PostMapping("/users/{id}/unlock")
    public ApiResponse<Void> unlockUser(
        @PathVariable("id") String userId,
        Authentication auth
    ) {
        adminService.unlockUser(userId, currentUserId(auth));
        return ApiResponse.success("Đã mở khóa tài khoản", null);
    }

    @GetMapping("/settings/commission")
    public ApiResponse<Map<String, Integer>> getCommission() {
        return ApiResponse.success(Map.of("percent", adminService.getCommissionPercent()));
    }

    @PutMapping("/settings/commission")
    public ApiResponse<Map<String, Integer>> updateCommission(
        @Valid @RequestBody UpdateCommissionRequest req,
        Authentication auth
    ) {
        int percent = adminService.updateCommissionPercent(req.getPercent(), currentUserId(auth));
        return ApiResponse.success("Đã cập nhật hoa hồng", Map.of("percent", percent));
    }

    @GetMapping("/settings/debt-limit")
    public ApiResponse<Map<String, Long>> getDebtLimit() {
        return ApiResponse.success(Map.of("limit", adminService.getDebtLimit()));
    }

    @PutMapping("/settings/debt-limit")
    public ApiResponse<Map<String, Long>> updateDebtLimit(
        @Valid @RequestBody UpdateDebtLimitRequest req,
        Authentication auth
    ) {
        long limit = adminService.updateDebtLimit(req.getLimit(), currentUserId(auth));
        return ApiResponse.success("Đã cập nhật hạn mức nợ", Map.of("limit", limit));
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}