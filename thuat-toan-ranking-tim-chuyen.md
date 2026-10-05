# Thuật toán Ranking cho Tìm kiếm Chuyến xe ghép

## 1. Ý tưởng

Hiện tại hệ thống chỉ sort theo `departureTime ASC` — đúng nhưng đơn giản. Nâng cấp thành **multi-criteria ranking**: mỗi chuyến sau khi filter (cùng from/to/date) được chấm "điểm phù hợp" dựa trên 4 tiêu chí:

1. Thời gian khởi hành gần với giờ khách muốn (càng gần càng tốt)
2. Giá vé (càng rẻ càng tốt)
3. Rating tài xế (càng cao càng tốt)
4. Khoảng cách điểm đón thực tế (càng gần vị trí khách càng tốt — dùng Haversine)

Sắp xếp theo tổng điểm giảm dần, không chỉ theo giờ.

## 2. Pipeline 2 giai đoạn

**Stage 1 — FILTER** (giảm search space):
- Cùng `startProvince` + `endProvince`
- `departureTime` trong khoảng `[date, date+1 ngày]`
- `seatAvailable >= seats` yêu cầu
- `status = OPEN`

**Stage 2 — SCORE & SORT** (xếp hạng trong tập đã filter):
```
score = 0.35·time + 0.30·price + 0.20·rating + 0.15·distance
```
Tất cả thành phần được min-max normalized về `[0,1]` (cao = tốt), sau đó `ORDER BY score DESC`.

## 3. Code

```java
public List<TripResponse> searchTripsRanked(SearchTripsRequest req) {
    // Stage 1: FILTER (giống cũ)
    List<Trip> candidates = tripRepository.searchTrips(
        TripStatus.OPEN,
        resolveProvince(req.getFrom()).getId(),
        resolveProvince(req.getTo()).getId(),
        req.getDate().atStartOfDay(),
        req.getDate().atTime(23, 59, 59),
        req.getSeats()
    );
    if (candidates.isEmpty()) return List.of();

    // Fetch rating của tất cả driver liên quan trong 1 query duy nhất
    // (tránh N+1: KHÔNG gọi findByUserId() riêng lẻ trong vòng lặp)
    List<Long> driverIds = candidates.stream()
        .map(t -> t.getDriver().getId())
        .distinct()
        .toList();
    Map<Long, BigDecimal> ratingByDriverId = driverProfileRepository
        .findAllByUserIdIn(driverIds).stream()
        .collect(Collectors.toMap(
            DriverProfile::getUserId,
            DriverProfile::getDriverRating
        ));

    // Lấy max/min để chuẩn hoá (normalization)
    long maxPrice = candidates.stream().mapToLong(t -> t.getPriceVnd().longValue()).max().orElse(1);
    long minPrice = candidates.stream().mapToLong(t -> t.getPriceVnd().longValue()).min().orElse(0);
    BigDecimal maxRating = ratingByDriverId.values().stream()
        .max(BigDecimal::compareTo).orElse(BigDecimal.ONE);

    double preferredEpoch = req.getPreferredTime() != null
        ? req.getPreferredTime().toLocalTime().toSecondOfDay() : 43200; // mặc định 12:00

    // Stage 2: SCORE
    record ScoredTrip(TripResponse response, double score) {}
    List<ScoredTrip> scored = candidates.stream()
        .map(trip -> {
            double score = scoreTrip(
                trip,
                req.getPickupLat(), req.getPickupLng(),
                preferredEpoch,
                minPrice, maxPrice,
                maxRating,
                ratingByDriverId
            );
            return new ScoredTrip(toResponse(trip), score);
        })
        .sorted(Comparator.<ScoredTrip>comparingDouble(s -> s.score()).reversed())
        .toList();

    return scored.stream().map(ScoredTrip::response).toList();
}

private double scoreTrip(
    Trip trip,
    Double userLat, Double userLng,
    double preferredTimeSec,
    long minPrice, long maxPrice,
    BigDecimal maxRating,
    Map<Long, BigDecimal> ratingByDriverId
) {
    // Trọng số (tổng = 1.0)
    final double W_TIME  = 0.35;
    final double W_PRICE = 0.30;
    final double W_RATING = 0.20;
    final double W_DIST  = 0.15;

    // 1. Điểm thời gian: càng gần giờ preferred càng cao
    double tripTime = trip.getDepartureTime().toLocalTime().toSecondOfDay();
    double timeDiff = Math.abs(tripTime - preferredTimeSec);
    double maxTimeDiff = 12 * 3600; // tối đa 12 tiếng lệch
    double timeScore = 1.0 - Math.min(timeDiff / maxTimeDiff, 1.0);

    // 2. Điểm giá: rẻ hơn max càng tốt
    long price = trip.getPriceVnd().longValue();
    double priceScore = maxPrice > minPrice
        ? 1.0 - (double)(price - minPrice) / (maxPrice - minPrice)
        : 1.0;

    // 3. Điểm rating: cao hơn càng tốt (chuẩn hoá về [0,1])
    BigDecimal driverRating = ratingByDriverId.getOrDefault(trip.getDriver().getId(), BigDecimal.ZERO);
    double ratingScore = maxRating.compareTo(BigDecimal.ZERO) > 0
        ? driverRating.divide(maxRating, 2, RoundingMode.HALF_UP).doubleValue()
        : 0.0;

    // 4. Điểm khoảng cách: càng gần vị trí khách càng tốt (Haversine)
    // Yêu cầu: Trip entity phải có pickupLat/pickupLng (lấy khi tài xế tạo chuyến,
    // hoặc geocode startAddressText một lần rồi lưu lại — KHÔNG hard-code toạ độ demo).
    double distScore = 0.5; // mặc định nếu khách không có vị trí
    if (userLat != null && userLng != null
        && trip.getPickupLat() != null && trip.getPickupLng() != null) {
        double distance = haversine(userLat, userLng, trip.getPickupLat(), trip.getPickupLng());
        double maxDist = 50.0; // km
        distScore = 1.0 - Math.min(distance / maxDist, 1.0);
    }

    return W_TIME * timeScore + W_PRICE * priceScore
         + W_RATING * ratingScore + W_DIST * distScore;
}

/**
 * Khoảng cách Haversine giữa 2 điểm lat/lng (km).
 */
private double haversine(double lat1, double lng1, double lat2, double lng2) {
    double R = 6371; // bán kính trái đất (km)
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

## 4. Lưu ý khi triển khai (khác với bản nháp ban đầu)

- **Không hard-code toạ độ demo** trong hàm Haversine — phải dùng `pickupLat`/`pickupLng` thật của từng `Trip`. Cần thêm 2 cột này vào entity `Trip` và điền dữ liệu lúc tài xế tạo chuyến (hoặc geocode `startAddressText` một lần rồi lưu).
- **Tránh N+1 query**: fetch rating của tất cả driver liên quan bằng một query duy nhất (`findAllByUserIdIn`) trước khi scoring, thay vì gọi `findByUserId()` lặp lại cho từng trip.
- Khi khách không cung cấp vị trí, `distScore` mặc định 0.5 — có thể nâng cấp bằng cách renormalize 3 trọng số còn lại để tổng = 1, nếu muốn chặt chẽ hơn về mặt lý thuyết.

## 5. Các thuật toán/kỹ thuật đã dùng (liệt kê trong báo cáo)

- Filter SQL + JPA — cơ bản
- Min-Max Normalization — chuẩn hoá điểm
- Weighted Sum Model — kết hợp đa tiêu chí
- Haversine Formula — khoảng cách GPS

## 6. Mở rộng nếu muốn "xịn" hơn (optional)

| Thuật toán | Áp dụng cho | Độ phức tạp |
|---|---|---|
| TF-IDF | Tìm chuyến match với mô tả / ghi chú của khách | Trung bình |
| Greedy Insertion | Ghép khách vào chuyến có điểm dừng trung gian | Cao |
| Hungarian Algorithm | Tối ưu phân công tài xế ↔ khách (mỗi tài xế nhiều khách) | Rất cao |
| Sliding Window Time Match | Tìm chuyến khởi hành trong khoảng [t-30p, t+30p] | Dễ |

→ Cho đồ án, 2-stage filter + weighted score đã đủ demo "thuật toán". Nếu muốn ấn tượng hơn, thêm Haversine (dùng toạ độ thật) + normalize là đẹp rồi.

## 7. Cô giáo hỏi gì thì trả lời gì?

| Câu hỏi | Trả lời |
|---|---|
| "Tại sao không sort theo giờ đơn giản?" | Sort theo giờ không tối ưu — khách muốn tổng thể tốt nhất (giá + rating + khoảng cách), không chỉ gần giờ nhất |
| "Normalize để làm gì?" | Đưa các đại lượng khác đơn vị (giá VND, rating 0-5, khoảng cách km) về cùng thang [0,1] để cộng được |
| "Trọng số 0.35/0.30/0.20/0.15 lấy đâu?" | Do em quyết định dựa trên UX (khách quan tâm giờ + giá nhiều nhất). Có thể điều chỉnh dựa trên feedback |
| "Có thuật toán nào nâng cao hơn không?" | Có — TF-IDF cho ghi chú, Greedy Insertion cho điểm dừng, Hungarian cho matching tài xế-khách |
| "Làm sao tránh N+1 query khi lấy rating?" | Fetch rating của tất cả driver liên quan bằng một query (`findAllByUserIdIn`) trước khi scoring, cache vào Map |
