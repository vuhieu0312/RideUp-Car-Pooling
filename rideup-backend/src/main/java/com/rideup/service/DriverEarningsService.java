package com.rideup.service;

import com.rideup.entity.Booking;
import com.rideup.entity.Payment;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import com.rideup.repository.PaymentRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Thống kê thu nhập tài xế từ các booking đã hoàn thành (tính theo ngày khởi hành).
 * Phí nền tảng chỉ áp dụng cho thanh toán Stripe; tiền mặt tài xế thu trực tiếp nên thực nhận = doanh thu.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverEarningsService {

    private static final int DAYS = 30;
    private static final int MONTHS = 6;
    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("MM/yyyy");

    final PaymentRepository paymentRepository;

    @Value("${stripe.connect.platform-fee-percent:10}")
    int feePercent;

    public record Bucket(String label, BigDecimal gross, BigDecimal fee, BigDecimal net, int bookings) {}

    public record Stats(BigDecimal totalGross, BigDecimal totalFee, BigDecimal totalNet,
                        BigDecimal stripeNet, BigDecimal cashNet,
                        int trips, int bookings, int seats,
                        BigDecimal todayNet, BigDecimal monthNet,
                        List<Bucket> daily, List<Bucket> monthly, int feePercent) {}

    /** Bộ cộng dồn doanh thu / phí của một ngày, một tháng hoặc toàn bộ. */
    private static final class Acc {
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal fee = BigDecimal.ZERO;
        int bookings;

        void add(BigDecimal g, BigDecimal f) { gross = gross.add(g); fee = fee.add(f); bookings++; }
        BigDecimal net() { return gross.subtract(fee); }
        Bucket bucket(String label) { return new Bucket(label, gross, fee, net(), bookings); }
    }

    @Transactional(readOnly = true)
    public Stats getStats(String driverUserId) {
        LocalDate today = LocalDate.now();
        YearMonth thisMonth = YearMonth.from(today);

        Map<LocalDate, Acc> byDay = new TreeMap<>();
        Map<YearMonth, Acc> byMonth = new TreeMap<>();
        for (int i = 0; i < DAYS; i++) byDay.put(today.minusDays(i), new Acc());
        for (int i = 0; i < MONTHS; i++) byMonth.put(thisMonth.minusMonths(i), new Acc());

        Acc total = new Acc();
        BigDecimal cash = BigDecimal.ZERO;
        Set<String> tripIds = new HashSet<>();
        int seats = 0;

        for (Payment p : paymentRepository.findCompletedForStats(
                driverUserId, BookingStatus.COMPLETED,
                List.of(PaymentStatus.VOIDED, PaymentStatus.FAILED, PaymentStatus.REFUNDED),
                thisMonth.minusMonths(MONTHS - 1).atDay(1).atStartOfDay())) {
            Booking b = p.getBooking();
            BigDecimal gross = p.getAmount() != null ? p.getAmount() : b.getTotalAmount();
            if (gross == null) continue;

            boolean stripe = p.getMethod() == PaymentMethod.STRIPE;
            BigDecimal fee = !stripe ? BigDecimal.ZERO
                : p.getPlatformFee() != null ? p.getPlatformFee() : StripeConnectService.feeOf(gross, feePercent);
            LocalDate day = b.getTrip().getDepartureTime().toLocalDate();

            total.add(gross, fee);
            if (!stripe) cash = cash.add(gross);
            tripIds.add(b.getTrip().getId());
            if (b.getSeatCount() != null) seats += b.getSeatCount();
            for (Acc a : new Acc[] {byDay.get(day), byMonth.get(YearMonth.from(day))}) {
                if (a != null) a.add(gross, fee);
            }
        }

        return new Stats(total.gross, total.fee, total.net(), total.net().subtract(cash), cash,
            tripIds.size(), total.bookings, seats,
            byDay.get(today).net(), byMonth.get(thisMonth).net(),
            byDay.entrySet().stream().map(e -> e.getValue().bucket(e.getKey().format(DAY_FMT))).toList(),
            byMonth.entrySet().stream().map(e -> e.getValue().bucket(e.getKey().format(MONTH_FMT))).toList(),
            feePercent);
    }
}
