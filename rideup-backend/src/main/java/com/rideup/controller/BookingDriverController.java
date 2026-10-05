package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.response.BookingResponse;
import com.rideup.enums.BookingStatus;
import com.rideup.service.BookingService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Booking endpoints dành cho DRIVER (đã APPROVED).
 * Tài xế xem các booking cho chuyến của mình, xác nhận hoặc từ chối.
 *
 * Lưu ý: Tài xế không có endpoint đặt booking (đặt chỗ là CUSTOMER).
 */
@RestController
@RequestMapping("/driver/bookings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('DRIVER')")
public class BookingDriverController {

    BookingService bookingService;

    @GetMapping
    public ApiResponse<List<BookingResponse>> listAll(Authentication auth) {
        return ApiResponse.success(
            bookingService.listMyTripBookings(currentUserId(auth), null)
        );
    }

    @GetMapping("/pending")
    public ApiResponse<List<BookingResponse>> listPending(Authentication auth) {
        return ApiResponse.success(
            bookingService.listMyTripBookings(currentUserId(auth), BookingStatus.PENDING)
        );
    }

    @PostMapping("/{id}/confirm")
    public ApiResponse<BookingResponse> confirm(
        @PathVariable("id") String bookingId,
        Authentication auth
    ) {
        return ApiResponse.success(
            "Đã xác nhận booking",
            bookingService.confirm(bookingId, currentUserId(auth))
        );
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<BookingResponse> reject(
        @PathVariable("id") String bookingId,
        @RequestParam(required = false, defaultValue = "Tài xế không nhận") String reason,
        Authentication auth
    ) {
        return ApiResponse.success(
            "Đã từ chối booking",
            bookingService.reject(bookingId, currentUserId(auth), reason)
        );
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}