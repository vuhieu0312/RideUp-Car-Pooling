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

/** Ví và rút tiền của tài xế (Stripe Connect, môi trường test). */
@RestController
@RequestMapping("/driver/payout")
@PreAuthorize("hasRole('DRIVER')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverPayoutController {

    StripeConnectService stripeConnectService;
    DriverEarningsService driverEarningsService;

    /** Trạng thái tài khoản nhận tiền, số dư, lịch sử rút và các khoản đã nhận. */
    @GetMapping("/summary")
    public ApiResponse<StripeConnectService.Summary> summary(Authentication auth) {
        return ApiResponse.success(stripeConnectService.getSummary(currentUserId(auth)));
    }

    /** Thống kê thu nhập: tổng, theo ngày (30 ngày), theo tháng (6 tháng). */
    @GetMapping("/stats")
    public ApiResponse<DriverEarningsService.Stats> stats(Authentication auth) {
        return ApiResponse.success(driverEarningsService.getStats(currentUserId(auth)));
    }

    /** Trả link của Stripe để tài xế thiết lập tài khoản và thêm thẻ / ngân hàng. */
    @PostMapping("/onboarding")
    public ApiResponse<StripeConnectService.OnboardingLink> onboarding(Authentication auth) {
        // Địa chỉ backend như điện thoại đang gọi (vd. http://192.168.1.10:8080/api) để trang quay lại mở được
        String apiBase = ServletUriComponentsBuilder.fromCurrentContextPath().toUriString();
        return ApiResponse.success(stripeConnectService.createOnboardingLink(currentUserId(auth), apiBase));
    }

    /** Rút toàn bộ số dư khả dụng. */
    @PostMapping("/withdraw")
    public ApiResponse<StripeConnectService.PayoutItem> withdraw(Authentication auth) {
        return ApiResponse.success("Đã gửi yêu cầu rút tiền", stripeConnectService.withdraw(currentUserId(auth)));
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
