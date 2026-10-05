package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.dto.response.ProvinceResponse;
import com.rideup.dto.response.WardResponse;
import com.rideup.service.LocationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public location endpoints — dùng cho driver/customer chọn tỉnh/xã từ dropdown.
 * Không yêu cầu JWT vì location là data tĩnh.
 */
@RestController
@RequestMapping("/locations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LocationController {

    LocationService locationService;

    @GetMapping("/provinces")
    public ApiResponse<List<ProvinceResponse>> listProvinces(
        @RequestParam(required = false) String keyword
    ) {
        return ApiResponse.success(locationService.listProvinces(keyword));
    }

    @GetMapping("/provinces/{id}")
    public ApiResponse<ProvinceResponse> getProvince(@PathVariable String id) {
        return ApiResponse.success(locationService.getProvince(id));
    }

    @GetMapping("/wards")
    public ApiResponse<List<WardResponse>> listWards(
        @RequestParam(required = false) String provinceId,
        @RequestParam(required = false) String keyword
    ) {
        return ApiResponse.success(locationService.listWards(provinceId, keyword));
    }

    @GetMapping("/wards/{id}")
    public ApiResponse<WardResponse> getWard(@PathVariable String id) {
        return ApiResponse.success(locationService.getWard(id));
    }
}