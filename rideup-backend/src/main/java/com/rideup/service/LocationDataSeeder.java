package com.rideup.service;

import com.rideup.entity.Province;
import com.rideup.entity.Ward;
import com.rideup.repository.ProvinceRepository;
import com.rideup.repository.WardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Cào dữ liệu Tỉnh/Phường từ OpenStreetMap Overpass API.
 *
 * Cấu trúc:
 * - 63 tỉnh/thành phố VN (admin_level=4)
 * - ~3,300 phường/xã (admin_level=8, fallback 6 nếu không có)
 *
 * KHÔNG auto-run khi app khởi động — chỉ chạy khi admin gọi API trigger
 * (POST /api/admin/locations/seed). Vì:
 * 1. Overpass API có rate-limit, không nên spam mỗi lần restart
 * 2. Nếu Overpass down → app vẫn start được (seed fail thì log warning, OK)
 *
 * Idempotent: chạy nhiều lần không tạo duplicate (check osmId đã tồn tại).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocationDataSeeder {

    /** Nhiều Overpass server — fallback khi 1 cái down/rate-limit. */
    private static final List<String> OVERPASS_URLS = List.of(
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter"
    );

    private final ProvinceRepository provinceRepository;
    private final WardRepository wardRepository;
    private final RestTemplate restTemplate;

    @Value("${location.seeding.delay-between-province-ms:5000}")
    private long delayBetweenProvinceMs;

    @Value("${location.seeding.max-retries:3}")
    private int maxRetries;

    @Value("${location.seeding.initial-backoff-ms:1500}")
    private long initialBackoffMs;

    /**
     * Seed TỉNH trước, sau đó seed Phường/Xã cho từng tỉnh.
     * Có thể gọi nhiều lần — idempotent.
     */
    public SeedResult seedAll() throws InterruptedException {
        if (provinceRepository.count() > 0) {
            log.info("[Seeder] Provinces already present — skip province seed");
        } else {
            log.info("[Seeder] Fetching provinces from Overpass...");
            int savedProvinces = fetchAndSaveProvinces();
            log.info("[Seeder] Saved {} provinces", savedProvinces);
        }

        List<Province> provinces = provinceRepository.findAll();
        int totalWards = 0;
        for (Province p : provinces) {
            try {
                int saved = fetchAndSaveWards(p);
                totalWards += saved;
                log.info("[Seeder]  → {} wards for {}", saved, p.getName());
            } catch (Exception ex) {
                log.warn("[Seeder]  ↳ Could not fetch wards for {}: {}", p.getName(), ex.getMessage());
            }
            Thread.sleep(delayBetweenProvinceMs);
        }
        return new SeedResult(provinceRepository.count(), totalWards);
    }

    @Transactional
    public int fetchAndSaveProvinces() {
        String query =
            "[out:json][timeout:60];" +
            "area[\"ISO3166-1\"=\"VN\"][admin_level=2];" +
            "rel(area)[\"admin_level\"=\"4\"][\"boundary\"=\"administrative\"];" +
            "out tags center;";

        Map<String, Object> body = callOverpass(query, 60_000);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> elements = (List<Map<String, Object>>) body.get("elements");
        if (elements == null || elements.isEmpty()) {
            throw new RuntimeException("Overpass returned no province elements");
        }

        List<Province> toSave = elements.stream()
            .filter(el -> el.get("tags") != null && el.get("center") != null)
            .map(el -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> tags = (Map<String, Object>) el.get("tags");
                @SuppressWarnings("unchecked")
                Map<String, Object> center = (Map<String, Object>) el.get("center");

                String name = tags.containsKey("name:vi")
                    ? (String) tags.get("name:vi")
                    : (String) tags.get("name");
                String isoCode = (String) tags.get("ISO3166-2");

                Long osmId = toLong(el.get("id"));
                String code = extractProvinceCode(isoCode);

                // Skip nếu đã có (theo osmId HOẶC code)
                if (osmId != null && provinceRepository.findByOsmid(osmId).isPresent()) {
                    return null;
                }
                if (code != null && provinceRepository.findByCode(code).isPresent()) {
                    return null;
                }

                return Province.builder()
                    .name(name)
                    .code(code)
                    .osmid(osmId)
                    .lat(toBigDecimal(center.get("lat")))
                    .lng(toBigDecimal(center.get("lon")))
                    .build();
            })
            .filter(p -> p != null)
            .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
            .toList();

        provinceRepository.saveAll(toSave);
        return toSave.size();
    }

    @Transactional
    public int fetchAndSaveWards(Province province) {
        if (province.getOsmid() == null) return 0;
        if (wardRepository.countByProvinceId(province.getId()) > 0) {
            log.info("[Seeder]  ↳ {} already has wards — skip", province.getName());
            return 0;
        }

        // Try admin_level=8 first (most accurate), fallback 6
        int saved = doFetchWards(province, 8);
        if (saved == 0) {
            log.debug("[Seeder]  ↳ Retrying {} with admin_level=6", province.getName());
            saved = doFetchWards(province, 6);
        }
        return saved;
    }

    private int doFetchWards(Province province, int adminLevel) {
        String query = String.format(
            "[out:json][timeout:60];" +
            "area(%d)->.provArea;" +
            "rel(area.provArea)[\"admin_level\"=\"%d\"][\"boundary\"=\"administrative\"];" +
            "out tags center;",
            toOverpassAreaId(province.getOsmid()), adminLevel);

        Map<String, Object> body;
        try {
            body = callOverpass(query, 60_000);
        } catch (Exception ex) {
            log.warn("[Seeder]   ↳ Overpass error for {} (level {}): {}",
                province.getName(), adminLevel, ex.getMessage());
            return 0;
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> elements = (List<Map<String, Object>>) body.get("elements");
        if (elements == null || elements.isEmpty()) return 0;

        List<Ward> wards = elements.stream()
            .filter(el -> el.get("tags") != null && el.get("center") != null)
            .filter(el -> {
                Long osmId = toLong(el.get("id"));
                return osmId == null || !wardRepository.existsByOsmid(osmId);
            })
            .map(el -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> tags = (Map<String, Object>) el.get("tags");
                @SuppressWarnings("unchecked")
                Map<String, Object> center = (Map<String, Object>) el.get("center");

                String name = tags.containsKey("name:vi")
                    ? (String) tags.get("name:vi")
                    : (String) tags.get("name");

                return Ward.builder()
                    .name(name)
                    .displayName((String) tags.getOrDefault("name", name))
                    .osmid(toLong(el.get("id")))
                    .lat(toBigDecimal(center.get("lat")))
                    .lng(toBigDecimal(center.get("lon")))
                    .provinceId(province.getId())
                    .build();
            })
            .toList();

        wardRepository.saveAll(wards);
        return wards.size();
    }

    // Helper to suppress unused-import warning
    private static <T> List<T> castList(Object o) {
        @SuppressWarnings("unchecked")
        List<T> r = (List<T>) o;
        return r;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callOverpass(String query, int timeoutMs) {
        RuntimeException lastFailure = null;
        for (String endpoint : OVERPASS_URLS) {
            try {
                return postWithRetry(endpoint, query, timeoutMs);
            } catch (RuntimeException ex) {
                lastFailure = ex;
                log.warn("[Seeder] Overpass endpoint failed {}: {}", endpoint, ex.getMessage());
            }
        }
        throw new RuntimeException("All Overpass endpoints failed", lastFailure);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postWithRetry(String endpoint, String query, int timeoutMs) {
        long backoff = initialBackoffMs;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                headers.add(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
                headers.add(HttpHeaders.USER_AGENT, "RideUp-Backend/1.0");

                MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
                form.add("data", query);

                HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);
                return restTemplate.postForObject(endpoint, request, Map.class);
            } catch (HttpStatusCodeException ex) {
                int status = ex.getStatusCode().value();
                if (!isRetryableStatus(status) || attempt == maxRetries) {
                    throw new RuntimeException("HTTP " + status + " from Overpass", ex);
                }
            } catch (ResourceAccessException ex) {
                if (attempt == maxRetries) {
                    throw new RuntimeException("Timeout/network error from Overpass", ex);
                }
            }

            long jitter = ThreadLocalRandom.current().nextLong(200, 700);
            long sleepMs = backoff + jitter;
            log.warn("[Seeder] Retry {}/{} after {} ms for endpoint {}", attempt, maxRetries, sleepMs, endpoint);
            sleepQuietly(sleepMs);
            backoff = Math.min(backoff * 2, 10_000);
        }
        throw new RuntimeException("Overpass request failed after retries");
    }

    private static boolean isRetryableStatus(int status) {
        return status == 408 || status == 429 || (status >= 500 && status <= 599);
    }

    private void sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Thread interrupted during backoff", ex);
        }
    }

    private static Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

    private static BigDecimal toBigDecimal(Object val) {
        if (val == null) return null;
        if (val instanceof BigDecimal bd) return bd;
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(val.toString()); } catch (Exception e) { return null; }
    }

    /** Overpass area ID cho relation = 3600000000 + osmId. */
    private static long toOverpassAreaId(Long relationId) {
        if (relationId == null) {
            throw new IllegalArgumentException("Province OSM relation id is required");
        }
        return 3_600_000_000L + relationId;
    }

    /** "VN-65" → "65". Trả về null nếu null/blank. */
    private static String extractProvinceCode(String isoCode) {
        if (isoCode == null || isoCode.isBlank()) return null;
        int dash = isoCode.indexOf('-');
        if (dash < 0 || dash == isoCode.length() - 1) return isoCode.trim();
        return isoCode.substring(dash + 1).trim();
    }

    /** Kết quả trả về cho API trigger. */
    public record SeedResult(long provinceCount, long wardCount) {}
}