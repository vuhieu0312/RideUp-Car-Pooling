package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.request.CreateTripRequest;
import com.rideup.dto.request.SearchTripsRequest;
import com.rideup.dto.response.TripResponse;
import com.rideup.service.TripService;
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
@RequestMapping("/trips")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripController {

    TripService tripService;

    /** Driver tạo chuyến mới. Yêu cầu đã APPROVED + có xe verified. */
    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<TripResponse> create(
            @Valid @RequestBody CreateTripRequest req,
            Authentication auth) {
        return ApiResponse.success(
                "Tạo chuyến thành công",
                tripService.createTrip(currentUserId(auth), req));
    }

    /** Driver xem các chuyến của mình. */
    @GetMapping("/mine")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<List<TripResponse>> listMine(Authentication auth) {
        return ApiResponse.success(tripService.listMyTrips(currentUserId(auth)));
    }

    /**
     * Customer tìm chuyến — sort theo departureTime ASC (đơn giản).
     */
    @PostMapping("/search")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<List<TripResponse>> search(
            @Valid @RequestBody SearchTripsRequest req) {
        return ApiResponse.success(
                tripService.searchTrips(req));
    }

    /**
     * Customer tìm chuyến với thuật toán ranking (weighted sum).
     * 4 tiêu chí: thời gian (35%) + giá (30%) + rating (20%) + khoảng cách (15%).
     * Xem {@link TripService#searchTripsRanked} để biết chi tiết.
     */
    @PostMapping("/search-ranking")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<List<TripResponse>> searchRanking(
            @Valid @RequestBody SearchTripsRequest req) {
        return ApiResponse.success(tripService.searchTripsRanked(req));
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}