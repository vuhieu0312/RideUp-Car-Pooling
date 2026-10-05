package com.rideup.controller;

import com.rideup.exception.ApiResponse;
import com.rideup.repository.ProvinceRepository;
import com.rideup.repository.WardRepository;
import com.rideup.service.LocationDataSeeder;
import com.rideup.service.LocationDataSeeder.SeedResult;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Admin endpoints cho Location (Province/Ward):
 * - POST /api/admin/locations/seed — trigger cào dữ liệu từ Overpass API
 * - GET  /api/admin/locations/stats — xem trạng thái DB (đếm province/ward)
 */
@RestController
@RequestMapping("/admin/locations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('ADMIN')")
public class LocationAdminController {

    LocationDataSeeder locationDataSeeder;
    ProvinceRepository provinceRepository;
    WardRepository wardRepository;

    /**
     * Trigger cào tất cả tỉnh + phường/xã từ OpenStreetMap Overpass.
     * QUÁ TRÌNH này mất ~5-10 phút (63 tỉnh × 2s delay = 2 phút + query mỗi tỉnh).
     *
     * Idempotent — gọi nhiều lần không tạo duplicate.
     */
    @PostMapping("/seed")
    public ApiResponse<SeedResult> seed() {
        try {
            SeedResult result = locationDataSeeder.seedAll();
            return ApiResponse.success(
                "Cào dữ liệu hoàn tất: " + result.provinceCount() + " tỉnh, " + result.wardCount() + " phường/xã",
                result
            );
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return ApiResponse.error(500, "Seed bị ngắt giữa chừng");
        } catch (Exception ex) {
            return ApiResponse.error(500,
                "Seed thất bại: " + ex.getMessage());
        }
    }

    @GetMapping("/stats")
    public ApiResponse<Map<String, Long>> stats() {
        return ApiResponse.success(Map.of(
            "provinces", provinceRepository.count(),
            "wards", wardRepository.count()
        ));
    }
}