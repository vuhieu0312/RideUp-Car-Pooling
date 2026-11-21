package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.service.WalletService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.Map;

@RestController
@RequestMapping("/driver/wallet")
@PreAuthorize("hasRole('DRIVER')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverWalletController {

    WalletService walletService;

    @GetMapping
    public ApiResponse<WalletService.Summary> summary(Authentication auth) {
        return ApiResponse.success(walletService.getSummary(currentUserId(auth)));
    }

    @PostMapping("/deposit")
    public ApiResponse<WalletService.DepositLink> deposit(
            @RequestBody(required = false) Map<String, Long> body,
            Authentication auth) {
        Long amount = body == null ? null : body.get("amount");
        String apiBase = ServletUriComponentsBuilder.fromCurrentContextPath().toUriString();
        return ApiResponse.success(walletService.createDeposit(currentUserId(auth), amount, apiBase));
    }

    @PostMapping("/deposit-intent")
    public ApiResponse<WalletService.DepositIntent> depositIntent(
            @RequestBody(required = false) Map<String, Long> body,
            Authentication auth) {
        Long amount = body == null ? null : body.get("amount");
        return ApiResponse.success(walletService.createDepositIntent(currentUserId(auth), amount));
    }

    @PostMapping("/deposit/confirm")
    public ApiResponse<WalletService.Summary> confirm(
            @RequestParam("reference") String reference,
            Authentication auth) {
        return ApiResponse.success("Đã cập nhật ví", walletService.confirmDeposit(currentUserId(auth), reference));
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
