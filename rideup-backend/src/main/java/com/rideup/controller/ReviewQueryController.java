package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.response.ReviewResponse;
import com.rideup.service.ReviewService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public endpoint — ai cũng có thể xem review của 1 tài xế.
 * GET /api/reviews/drivers/{driverId}
 */
@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewQueryController {

    ReviewService reviewService;

    @GetMapping("/drivers/{driverId}")
    public ApiResponse<List<ReviewResponse>> listDriverReviews(@PathVariable String driverId) {
        return ApiResponse.success(reviewService.listDriverReviews(driverId));
    }
}