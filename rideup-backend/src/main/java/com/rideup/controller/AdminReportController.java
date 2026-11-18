package com.rideup.controller;

import com.rideup.dto.request.ReviewReportRequest;
import com.rideup.dto.request.BulkReviewReportRequest;
import com.rideup.dto.response.ReportResponse;
import com.rideup.enums.ReportStatus;
import com.rideup.exception.ApiResponse;
import com.rideup.service.ReportService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/reports")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {

    ReportService reportService;

    @GetMapping
    public ApiResponse<List<ReportResponse>> list(
        @RequestParam(required = false) ReportStatus status
    ) {
        return ApiResponse.success(reportService.list(status));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<ReportResponse> review(
        @PathVariable String id,
        @Valid @RequestBody ReviewReportRequest request,
        Authentication authentication
    ) {
        String adminId = ((UserDetails) authentication.getPrincipal()).getUsername();
        String message = request.getStatus() == ReportStatus.APPROVED
            ? "Đã duyệt khiếu nại"
            : "Đã từ chối khiếu nại";
        return ApiResponse.success(message,
            reportService.review(id, adminId, request.getStatus()));
    }

    @PatchMapping("/bulk-status")
    public ApiResponse<List<ReportResponse>> bulkReview(
        @Valid @RequestBody BulkReviewReportRequest request,
        Authentication authentication
    ) {
        String adminId = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ApiResponse.success(
            "Đã xử lý hàng loạt " + request.getIds().size() + " khiếu nại",
            reportService.bulkReview(request.getIds(), adminId, request.getStatus())
        );
    }
}
