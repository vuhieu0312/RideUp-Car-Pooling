package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.repository.ProvinceRepository;
import com.rideup.repository.WardRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Admin endpoints cho Location (Province/Ward):
 * - GET  /api/admin/locations/stats — xem số province/ward trong DB
 * - POST /api/admin/locations/refresh — trigger refresh static data (khi cập nhật DB)
 *
 * Auto-seed (chạy lúc app khởi động) xử lý bởi LocationDataSeeder.seedIfEmpty()
 * qua ApplicationReadyEvent — không cần endpoint manual.
 */
@RestController
@RequestMapping("/admin/locations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('ADMIN')")
public class LocationAdminController {

    ProvinceRepository provinceRepository;
    WardRepository wardRepository;

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("provinces", provinceRepository.count());
        data.put("wards", wardRepository.count());
        return ApiResponse.success(data);
    }
}
