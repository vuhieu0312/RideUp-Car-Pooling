package com.rideup.service;

import com.rideup.entity.Province;
import com.rideup.entity.Ward;
import com.rideup.repository.ProvinceRepository;
import com.rideup.repository.WardRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.event.EventListener;
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
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LocationDataSeeder {

    private static final List<String> OVERPASS_URLS = List.of(
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.openstreetmap.ru/api/interpreter"
    );

    private static final long DELAY_BETWEEN_PROVINCE_MS = 2_000;

    private final ProvinceRepository provinceRepository;
    private final WardRepository wardRepository;
    private final RestTemplateBuilder restTemplateBuilder;

    @Value("${location.seeding.enabled:true}")
    private boolean seedOnStartupEnabled;

    @Value("${location.seeding.max-retries:3}")
    private int maxRetries;

    @Value("${location.seeding.initial-backoff-ms:1500}")
    private long initialBackoffMs;


    @EventListener(ApplicationReadyEvent.class)
    public void seedIfEmpty() {
        if (!seedOnStartupEnabled) {
            log.info("[LocationSeeder] Startup seed is disabled by configuration.");
            return;
        }

        long provinceCount = provinceRepository.count();
        long wardCount = wardRepository.count();

        if (provinceCount > 0 && wardCount > 0) {
            log.info("[LocationSeeder] Province/ward data already exists – skipping seed.");
            return;
        }

        if (provinceCount > 0) {
            log.info("[LocationSeeder] Provinces exist but wards are empty – seeding wards only...");
            try {
                backfillMissingProvinceCodes();
                seedWardsOnly();
                log.info("[LocationSeeder] Ward-only seed completed successfully.");
            } catch (Exception ex) {
                log.error("[LocationSeeder] Ward-only seed failed: {}", ex.getMessage(), ex);
            }
            return;
        }

        log.info("[LocationSeeder] Province table is empty – starting data seed from Overpass API...");
        try {
            seedAll();
            log.info("[LocationSeeder] Seed completed successfully.");
        } catch (Exception ex) {
            log.error("[LocationSeeder] Seed failed: {}", ex.getMessage(), ex);
        }
    }


    private void seedAll() throws InterruptedException {
        RestTemplate http = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(15))
                .setReadTimeout(Duration.ofSeconds(30))
                .build();

        List<Province> provinces = fetchAndSaveProvinces(http);
        log.info("[LocationSeeder] Saved {} provinces.", provinces.size());

        int totalWards = 0;
        for (Province province : provinces) {
            try {
                int count = fetchAndSaveWards(http, province);
                totalWards += count;
                log.info("[LocationSeeder]  → {} wards for {}", count, province.getName());
            } catch (Exception ex) {
                log.warn("[LocationSeeder]  ↳ Could not fetch wards for {}: {}",
                        province.getName(), ex.getMessage());
            }
            Thread.sleep(DELAY_BETWEEN_PROVINCE_MS);
        }
        log.info("[LocationSeeder] Total wards saved: {}", totalWards);
    }

    private void seedWardsOnly() throws InterruptedException {
        RestTemplate http = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(15))
                .setReadTimeout(Duration.ofSeconds(30))
                .build();

        List<Province> provinces = provinceRepository.findAll();
        int totalWards = 0;
        for (Province province : provinces) {
            try {
                int count = fetchAndSaveWards(http, province);
                totalWards += count;
                log.info("[LocationSeeder]  → {} wards for {}", count, province.getName());
            } catch (Exception ex) {
                log.warn("[LocationSeeder]  ↳ Could not fetch wards for {}: {}",
                        province.getName(), ex.getMessage());
            }
            Thread.sleep(DELAY_BETWEEN_PROVINCE_MS);
        }
        log.info("[LocationSeeder] Total wards saved (ward-only mode): {}", totalWards);
    }

    private void backfillMissingProvinceCodes() {
        RestTemplate http = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(15))
                .setReadTimeout(Duration.ofSeconds(30))
                .build();

        String query =
                "[out:json][timeout:30];" +
                        "area[\"ISO3166-1\"=\"VN\"][admin_level=2];" +
                        "rel(area)[\"admin_level\"=\"4\"][\"boundary\"=\"administrative\"];" +
                        "out tags;";

        Map<String, Object> body = callOverpass(http, query, 30_000);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> elements = (List<Map<String, Object>>) body.get("elements");
        if (elements == null || elements.isEmpty()) {
            return;
        }

        int updated = 0;
        for (Map<String, Object> element : elements) {
            @SuppressWarnings("unchecked")
            Map<String, Object> tags = (Map<String, Object>) element.get("tags");
            if (tags == null) {
                continue;
            }

            Long osmId = toLong(element.get("id"));
            String code = extractProvinceCode((String) tags.get("ISO3166-2"));
            if (osmId == null || code == null || code.isBlank()) {
                continue;
            }

            Province province = provinceRepository.findByOsmId(osmId).orElse(null);
            if (province == null) {
                continue;
            }

            if (province.getCode() == null || province.getCode().isBlank()) {
                province.setCode(code);
                provinceRepository.save(province);
                updated++;
            }
        }

        if (updated > 0) {
            log.info("[LocationSeeder] Backfilled province code for {} records.", updated);
        }
    }

    @Transactional
    public List<Province> fetchAndSaveProvinces(RestTemplate http) {
        String query =
                "[out:json][timeout:30];" +
                        "area[\"ISO3166-1\"=\"VN\"][admin_level=2];" +
                        "rel(area)[\"admin_level\"=\"4\"][\"boundary\"=\"administrative\"];" +
                        "out tags center;";

        Map<String, Object> body = callOverpass(http, query, 30_000);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> elements = (List<Map<String, Object>>) body.get("elements");
        if (elements == null || elements.isEmpty()) {
            throw new RuntimeException("Overpass returned no province elements");
        }

        List<Province> provinces = elements.stream()
                .filter(el -> el.get("tags") != null && el.get("center") != null)
                .map(el -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> tags   = (Map<String, Object>) el.get("tags");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> center = (Map<String, Object>) el.get("center");

                    String name = tags.containsKey("name:vi")
                            ? (String) tags.get("name:vi")
                            : (String) tags.get("name");

                    String isoCode = (String) tags.get("ISO3166-2");

                    return Province.builder()
                            .name(name)
                            .code(extractProvinceCode(isoCode))
                            .osmId(toLong(el.get("id")))
                            .lat(toBigDecimal(center.get("lat")))
                            .lng(toBigDecimal(center.get("lon")))
                            .build();
                })
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .toList();

        return provinceRepository.saveAll(provinces);
    }


    @Transactional
    public int fetchAndSaveWards(RestTemplate http, Province province) {
        if (province.getOsmId() == null) return 0;

        int saved = doFetchWards(http, province, 8);
        if (saved == 0) {
            log.debug("[LocationSeeder]  ↳ Retrying {} with admin_level=6", province.getName());
            saved = doFetchWards(http, province, 6);
        }
        return saved;
    }

    private int doFetchWards(RestTemplate http, Province province, int adminLevel) {
        String query = String.format(
                "[out:json][timeout:30];" +
                        "area(%d)->.provArea;" +
                        "rel(area.provArea)[\"admin_level\"=\"%d\"][\"boundary\"=\"administrative\"];" +
                        "out tags center;",
                toOverpassAreaId(province.getOsmId()), adminLevel);

        Map<String, Object> body;
        try {
            body = callOverpass(http, query, 35_000);
        } catch (Exception ex) {
            log.warn("[LocationSeeder]   ↳ Overpass error for {} (level {}): {}",
                    province.getName(), adminLevel, ex.getMessage());
            return 0;
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> elements = (List<Map<String, Object>>) body.get("elements");
        if (elements == null || elements.isEmpty()) return 0;

        List<Ward> wards = elements.stream()
                .filter(el -> el.get("tags") != null && el.get("center") != null)
                .filter(el -> {
                    // Bỏ qua ward đã tồn tại (idempotent)
                    Long osmId = toLong(el.get("id"));
                    return osmId == null || !wardRepository.existsByOsmId(osmId);
                })
                .map(el -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> tags   = (Map<String, Object>) el.get("tags");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> center = (Map<String, Object>) el.get("center");

                    String name = tags.containsKey("name:vi")
                            ? (String) tags.get("name:vi")
                            : (String) tags.get("name");
                    String displayName = (String) tags.getOrDefault("name", name);

                    return Ward.builder()
                            .name(name)
                            .displayName(displayName)
                            .osmId(toLong(el.get("id")))
                            .lat(toBigDecimal(center.get("lat")))
                            .lng(toBigDecimal(center.get("lon")))
                            .province(province)
                            .build();
                })
                .toList();

        wardRepository.saveAll(wards);
        return wards.size();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callOverpass(RestTemplate http, String query, int timeoutMs) {
        RuntimeException lastFailure = null;
        for (String endpoint : OVERPASS_URLS) {
            try {
                return postWithRetry(http, endpoint, query, timeoutMs);
            } catch (RuntimeException ex) {
                lastFailure = ex;
                log.warn("[LocationSeeder] Overpass endpoint failed {}: {}", endpoint, ex.getMessage());
            }
        }

        throw new RuntimeException("All Overpass endpoints failed", lastFailure);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postWithRetry(RestTemplate http, String endpoint, String query, int timeoutMs) {
        long backoff = initialBackoffMs;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                headers.add(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
                headers.add(HttpHeaders.USER_AGENT, "RideUp-LocationService/1.0");

                MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
                form.add("data", query);

                HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);
                Map<String, Object> response = http.postForObject(endpoint, request, Map.class);
                if (response == null) {
                    throw new RuntimeException("Empty response from Overpass");
                }
                return response;
            } catch (HttpStatusCodeException ex) {
                if (!isRetryableStatus(ex.getStatusCode().value()) || attempt == maxRetries) {
                    throw new RuntimeException("HTTP " + ex.getStatusCode().value() + " from Overpass", ex);
                }
            } catch (ResourceAccessException ex) {
                if (attempt == maxRetries) {
                    throw new RuntimeException("Timeout/network error from Overpass", ex);
                }
            }

            long jitter = ThreadLocalRandom.current().nextLong(200, 700);
            long sleepMs = backoff + jitter;
            log.warn("[LocationSeeder] Retry {}/{} after {} ms for endpoint {}", attempt, maxRetries, sleepMs, endpoint);
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
        if (val instanceof Long l) return l;
        if (val instanceof Integer i) return i.longValue();
        if (val instanceof Number n) return n.longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

    private static BigDecimal toBigDecimal(Object val) {
        if (val == null) return null;
        if (val instanceof BigDecimal bd) return bd;
        if (val instanceof Double d) return BigDecimal.valueOf(d);
        if (val instanceof Float f) return BigDecimal.valueOf(f);
        try { return new BigDecimal(val.toString()); } catch (Exception e) { return null; }
    }

    private static long toOverpassAreaId(Long relationId) {
        if (relationId == null) {
            throw new IllegalArgumentException("Province OSM relation id is required");
        }
        return 3_600_000_000L + relationId;
    }

    private static String extractProvinceCode(String isoCode) {
        if (isoCode == null || isoCode.isBlank()) {
            return null;
        }
        int dashIndex = isoCode.indexOf('-');
        if (dashIndex < 0 || dashIndex == isoCode.length() - 1) {
            return isoCode.trim();
        }
        return isoCode.substring(dashIndex + 1).trim();
    }
}
