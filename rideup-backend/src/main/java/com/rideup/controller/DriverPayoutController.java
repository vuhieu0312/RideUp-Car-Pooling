package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.service.DriverEarningsService;
import com.rideup.service.StripeConnectService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/driver/payout")
@PreAuthorize("hasRole('DRIVER')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverPayoutController {

    StripeConnectService stripeConnectService;
    DriverEarningsService driverEarningsService;

    @GetMapping("/summary")
    public ApiResponse<StripeConnectService.Summary> summary(Authentication auth) {
        return ApiResponse.success(stripeConnectService.getSummary(currentUserId(auth)));
    }

    @GetMapping("/stats")
    public ApiResponse<DriverEarningsService.Stats> stats(Authentication auth) {
        return ApiResponse.success(driverEarningsService.getStats(currentUserId(auth)));
    }

    @PostMapping("/onboarding")
    public ApiResponse<StripeConnectService.OnboardingLink> onboarding(Authentication auth) {
        // địa chỉ backend như điện thoại đang gọi, để trang quay lại mở được
        String apiBase = ServletUriComponentsBuilder.fromCurrentContextPath().toUriString();
        return ApiResponse.success(stripeConnectService.createOnboardingLink(currentUserId(auth), apiBase));
    }

    @PostMapping("/withdraw")
    public ApiResponse<StripeConnectService.PayoutItem> withdraw(Authentication auth) {
        return ApiResponse.success("Đã gửi yêu cầu rút tiền", stripeConnectService.withdraw(currentUserId(auth)));
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
