package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.CreateBookingRequest;
import com.rideup.dto.response.BookingResponse;
import com.rideup.service.BookingService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Booking endpoints dành cho CUSTOMER.
 * Tài xế (DRIVER) không thể gọi các endpoint này — tránh nhầm lẫn
 * giữa app khách và app tài xế.
 */
@RestController
@RequestMapping("/customer/bookings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('CUSTOMER')")
public class BookingCustomerController {

    BookingService bookingService;

    @PostMapping
    public ApiResponse<BookingResponse> create(
        @Valid @RequestBody CreateBookingRequest req,
        Authentication auth
    ) {
        return ApiResponse.success(
            "Đặt chỗ thành công, đang chờ tài xế xác nhận",
            bookingService.createBooking(currentUserId(auth), req)
        );
    }

    @GetMapping("/mine")
    public ApiResponse<List<BookingResponse>> listMine(Authentication auth) {
        return ApiResponse.success(bookingService.listMyBookings(currentUserId(auth)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<BookingResponse> cancel(
        @PathVariable("id") String bookingId,
        @RequestParam(required = false, defaultValue = "") String reason,
        Authentication auth
    ) {
        return ApiResponse.success(
            "Đã huỷ booking",
            bookingService.cancelByCustomer(bookingId, currentUserId(auth), reason)
        );
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}