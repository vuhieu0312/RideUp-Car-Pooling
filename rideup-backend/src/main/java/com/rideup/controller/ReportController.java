package com.rideup.controller;

import com.rideup.dto.request.CreateReportRequest;
import com.rideup.dto.response.ReportResponse;
import com.rideup.exception.ApiResponse;
import com.rideup.service.ReportService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasAnyRole('CUSTOMER', 'DRIVER')")
public class ReportController {

    ReportService reportService;

    @PostMapping
    public ApiResponse<ReportResponse> create(
        @Valid @RequestBody CreateReportRequest request,
        Authentication authentication
    ) {
        String reporterId = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ApiResponse.success("Đã gửi khiếu nại, chờ Admin xác minh", reportService.create(reporterId, request));
    }

    @GetMapping("/mine/submitted")
    public ApiResponse<List<ReportResponse>> listSubmitted(Authentication authentication) {
        String userId = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ApiResponse.success(reportService.listSubmitted(userId));
    }

    @GetMapping("/mine/received")
    public ApiResponse<List<ReportResponse>> listReceived(Authentication authentication) {
        String userId = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ApiResponse.success(reportService.listReceived(userId));
    }
}
