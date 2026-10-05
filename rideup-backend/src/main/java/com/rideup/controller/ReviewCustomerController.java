package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.CreateReviewRequest;
import com.rideup.dto.response.ReviewResponse;
import com.rideup.service.ReviewService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Customer tạo review cho tài xế (sau khi trip COMPLETED).
 * POST /api/customer/reviews/{tripId}
 */
@RestController
@RequestMapping("/customer/reviews")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('CUSTOMER')")
public class ReviewCustomerController {

    ReviewService reviewService;

    @PostMapping("/{tripId}")
    public ApiResponse<ReviewResponse> create(
        @PathVariable("tripId") String tripId,
        @Valid @RequestBody CreateReviewRequest req,
        Authentication auth
    ) {
        String userId = ((UserDetails) auth.getPrincipal()).getUsername();
        return ApiResponse.success(
            "Đánh giá thành công",
            reviewService.createReview(userId, tripId, req)
        );
    }
}