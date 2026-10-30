package com.rideup.service;

import com.rideup.entity.DriverProfile;
import com.rideup.entity.Payment;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.PaymentRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.model.Balance;
import com.stripe.model.BalanceTransaction;
import com.stripe.model.Charge;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Payout;
import com.stripe.model.Transfer;
import com.stripe.net.RequestOptions;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import com.stripe.param.AccountUpdateParams;
import com.stripe.param.PayoutCreateParams;
import com.stripe.param.PayoutListParams;
import com.stripe.param.TransferCreateParams;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Stripe Connect cho tài xế (môi trường test):
 *  - Tài xế thiết lập tài khoản nhận tiền (Express) và thêm thẻ / ngân hàng trên trang của Stripe.
 *  - Khi chuyến hoàn thành và tiền khách đã thu (capture), chuyển phần của tài xế (sau hoa hồng) sang tài khoản đó.
 *  - Tài xế xem số dư và rút về thẻ / ngân hàng.
 * Số tiền luôn tính ở server từ giao dịch thật của Stripe, không nhận từ client.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StripeConnectService {

    /** Tiền tệ Stripe tính không có phần lẻ. */
    private static final Set<String> ZERO_DECIMAL = Set.of(
        "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf");

    final DriverProfileRepository driverProfileRepository;
    final PaymentRepository paymentRepository;
    final DriverService driverService;

    @Value("${stripe.connect.country:US}")
    String country;

    @Value("${stripe.connect.platform-fee-percent:10}")
    int feePercent;

    @Value("${stripe.connect.return-base-url:}")
    String returnBaseUrl;

    // ===== DTO trả về app (amount tính theo đơn vị nhỏ nhất của Stripe, exponent = số chữ số thập phân) =====

    public record Money(long amount, String currency, int exponent) {}

    public record PayoutItem(String id, long amount, String currency, int exponent,
                             String status, Long arrivalDate, Long created, String failureMessage) {}

    public record EarningItem(String bookingCode, BigDecimal fare, BigDecimal platformFee, LocalDateTime paidAt) {}

    public record Summary(boolean configured, boolean hasAccount, boolean detailsSubmitted,
                          boolean payoutsEnabled, boolean transfersActive,
                          List<Money> available, List<Money> pending,
                          List<PayoutItem> payouts, List<EarningItem> earnings,
                          int feePercent, int waitingTransfers) {}

    public record OnboardingLink(String url) {}

    // ===== Thiết lập tài khoản nhận tiền =====

    /** Tạo (nếu chưa có) tài khoản Express của tài xế và trả link thiết lập của Stripe. */
    @Transactional
    public OnboardingLink createOnboardingLink(String userId, String apiBaseUrl) {
        requireConfigured();
        DriverProfile profile = driverService.requireApprovedDriver(userId);
        try {
            String accountId = accountOf(profile);
            if (accountId == null) {
                accountId = createExpressAccount(profile);
                profile.setStripeAccountId(accountId);
                driverProfileRepository.save(profile);
            }
            String base = (StringUtils.hasText(returnBaseUrl) ? returnBaseUrl : apiBaseUrl).replaceAll("/+$", "");
            return new OnboardingLink(AccountLink.create(AccountLinkCreateParams.builder()
                .setAccount(accountId)
                .setRefreshUrl(base + "/public/connect/refresh")
                .setReturnUrl(base + "/public/connect/return")
                .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                .build()).getUrl());
        } catch (StripeException e) {
            log.error("Tạo link thiết lập Stripe Connect lỗi (driver={}): {}", profile.getId(), e.getMessage());
            throw AppException.badRequest("Không tạo được link thiết lập nhận tiền: " + e.getMessage());
        }
    }

    private String createExpressAccount(DriverProfile profile) throws StripeException {
        // Key theo phút: chống bấm đúp, nhưng Stripe không phát lại lỗi cũ trong 24h
        Account account = Account.create(AccountCreateParams.builder()
                .setType(AccountCreateParams.Type.EXPRESS)
                .setCountry(country)
                .setEmail(profile.getUser().getEmail())
                .setBusinessType(AccountCreateParams.BusinessType.INDIVIDUAL)
                .setCapabilities(AccountCreateParams.Capabilities.builder()
                    .setTransfers(AccountCreateParams.Capabilities.Transfers.builder().setRequested(true).build())
                    .build())
                .putMetadata("driverProfileId", profile.getId())
                .putMetadata("userId", profile.getUser().getId())
                .build(),
            RequestOptions.builder()
                .setIdempotencyKey("connect-acct-" + profile.getId() + "-" + System.currentTimeMillis() / 60000)
                .build());

        // Tắt chi trả tự động hằng ngày để tài xế tự bấm "Rút tiền" trong app
        try {
            account.update(AccountUpdateParams.builder()
                .setSettings(AccountUpdateParams.Settings.builder()
                    .setPayouts(AccountUpdateParams.Settings.Payouts.builder()
                        .setSchedule(AccountUpdateParams.Settings.Payouts.Schedule.builder()
                            .setInterval(AccountUpdateParams.Settings.Payouts.Schedule.Interval.MANUAL)
                            .build())
                        .build())
                    .build())
                .build());
        } catch (StripeException e) {
            log.warn("Không đặt được chi trả thủ công cho {}: {}", account.getId(), e.getMessage());
        }
        log.info("Đã tạo tài khoản Stripe Connect {} cho driverProfile={}", account.getId(), profile.getId());
        return account.getId();
    }

    // ===== Chuyển phần của tài xế =====

    /** Gọi ngay sau khi capture; tài xế chưa có tài khoản Connect thì khoản này được chuyển bù khi họ mở ví. */
    public void transferAfterCapture(Payment payment) {
        try {
            driverProfileRepository.findByUserId(payment.getBooking().getTrip().getDriver().getId())
                .ifPresent(profile -> transferToDriver(payment, profile));
        } catch (RuntimeException e) {
            log.warn("Chưa chuyển được tiền cho tài xế (payment={}): {}", payment.getId(), e.getMessage());
        }
    }

    /**
     * Chuyển (giá vé - hoa hồng) từ khoản thu này sang tài khoản Connect của tài xế.
     * Không @Transactional và tự bắt mọi lỗi: lỗi Stripe không được làm hỏng việc kết thúc chuyến.
     * @return true nếu khoản này đã được chuyển (hoặc đã chuyển từ trước)
     */
    public boolean transferToDriver(Payment payment, DriverProfile profile) {
        if (payment.getTransferId() != null) return true;
        String accountId = accountOf(profile);
        if (accountId == null || !isConfigured() || payment.getMethod() != PaymentMethod.STRIPE
            || payment.getStatus() != PaymentStatus.PAID || payment.getTransactionId() == null) {
            return false;
        }
        try {
            String chargeId = PaymentIntent.retrieve(payment.getTransactionId()).getLatestCharge();
            if (chargeId == null) return false;
            // Transfer có source_transaction phải cùng tiền tệ với khoản thu -> tính trên balance transaction
            BalanceTransaction bt = BalanceTransaction.retrieve(Charge.retrieve(chargeId).getBalanceTransaction());
            long driverShare = bt.getAmount() * (100 - feePercent) / 100;
            if (driverShare <= 0) return false;

            Transfer transfer = Transfer.create(TransferCreateParams.builder()
                    .setAmount(driverShare)
                    .setCurrency(bt.getCurrency())
                    .setDestination(accountId)
                    .setSourceTransaction(chargeId)
                    .setTransferGroup("booking_" + payment.getBooking().getId())
                    .putMetadata("paymentId", payment.getId())
                    .putMetadata("bookingCode", String.valueOf(payment.getBooking().getBookingCode()))
                    .build(),
                RequestOptions.builder().setIdempotencyKey("connect-transfer-" + payment.getId()).build());

            payment.setTransferId(transfer.getId());
            payment.setPlatformFee(feeOf(payment.getAmount(), feePercent));
            paymentRepository.save(payment);
            log.info("Đã chuyển {} {} cho tài khoản {} (payment={}, transfer={})",
                driverShare, bt.getCurrency(), accountId, payment.getId(), transfer.getId());
            return true;
        } catch (StripeException | RuntimeException e) {
            log.warn("Chuyển tiền cho tài xế thất bại (payment={}), sẽ thử lại sau: {}", payment.getId(), e.getMessage());
            return false;
        }
    }

    // ===== Xem ví =====

    /** Trạng thái tài khoản, số dư, lịch sử rút, các khoản đã nhận. Tự chuyển bù các khoản còn chờ. */
    @Transactional
    public Summary getSummary(String userId) {
        DriverProfile profile = driverService.requireApprovedDriver(userId);
        String accountId = accountOf(profile);
        List<Payment> waiting = paymentRepository.findUntransferred(userId, PaymentMethod.STRIPE, PaymentStatus.PAID);

        if (!isConfigured() || accountId == null) {
            return new Summary(isConfigured(), false, false, false, false,
                List.of(), List.of(), List.of(), earnings(userId), feePercent, waiting.size());
        }
        try {
            Account account = Account.retrieve(accountId);
            boolean transfersActive = account.getCapabilities() != null
                && "active".equals(account.getCapabilities().getTransfers());
            int stillWaiting = transfersActive
                ? (int) waiting.stream().filter(p -> !transferToDriver(p, profile)).count()
                : waiting.size();

            RequestOptions asDriver = RequestOptions.builder().setStripeAccount(accountId).build();
            Balance balance = Balance.retrieve(asDriver);
            return new Summary(true, true,
                Boolean.TRUE.equals(account.getDetailsSubmitted()),
                Boolean.TRUE.equals(account.getPayoutsEnabled()),
                transfersActive,
                balance.getAvailable().stream().map(b -> money(b.getAmount(), b.getCurrency())).toList(),
                balance.getPending().stream().map(b -> money(b.getAmount(), b.getCurrency())).toList(),
                Payout.list(PayoutListParams.builder().setLimit(10L).build(), asDriver)
                    .getData().stream().map(StripeConnectService::payoutItem).toList(),
                earnings(userId), feePercent, stillWaiting);
        } catch (StripeException e) {
            log.error("Đọc ví Stripe Connect lỗi (driver={}): {}", profile.getId(), e.getMessage());
            throw AppException.badRequest("Không đọc được số dư từ Stripe: " + e.getMessage());
        }
    }

    // ===== Rút tiền =====

    /** Rút toàn bộ số dư khả dụng về thẻ / tài khoản ngân hàng tài xế đã thêm trên Stripe. */
    @Transactional
    public PayoutItem withdraw(String userId) {
        requireConfigured();
        DriverProfile profile = driverService.requireApprovedDriver(userId);
        String accountId = accountOf(profile);
        if (accountId == null) throw new AppException(ErrorCode.CONNECT_NOT_READY);
        try {
            if (!Boolean.TRUE.equals(Account.retrieve(accountId).getPayoutsEnabled())) {
                throw new AppException(ErrorCode.CONNECT_NOT_READY);
            }
            RequestOptions asDriver = RequestOptions.builder().setStripeAccount(accountId).build();
            Balance.Available avail = Balance.retrieve(asDriver).getAvailable().stream()
                .filter(b -> b.getAmount() != null && b.getAmount() > 0)
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.PAYOUT_NO_BALANCE));

            Payout payout = Payout.create(PayoutCreateParams.builder()
                .setAmount(avail.getAmount())
                .setCurrency(avail.getCurrency())
                .build(), asDriver);
            log.info("Tài xế {} rút {} {} → payout {} ({})", profile.getId(), avail.getAmount(),
                avail.getCurrency(), payout.getId(), payout.getStatus());
            return payoutItem(payout);
        } catch (StripeException e) {
            log.error("Rút tiền lỗi (driver={}): {}", profile.getId(), e.getMessage());
            throw AppException.badRequest("Rút tiền thất bại: " + e.getMessage());
        }
    }

    // ===== Tiện ích =====

    /** Phí nền tảng trên số tiền (VND), làm tròn xuống. */
    public static BigDecimal feeOf(BigDecimal amount, int percent) {
        return amount.multiply(BigDecimal.valueOf(percent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.DOWN);
    }

    private static boolean isConfigured() {
        return StringUtils.hasText(Stripe.apiKey);
    }

    private static void requireConfigured() {
        if (!isConfigured()) throw new AppException(ErrorCode.STRIPE_NOT_CONFIGURED);
    }

    /** Mã tài khoản Connect của tài xế, null nếu chưa có. */
    private static String accountOf(DriverProfile profile) {
        return StringUtils.hasText(profile.getStripeAccountId()) ? profile.getStripeAccountId() : null;
    }

    private List<EarningItem> earnings(String userId) {
        return paymentRepository.findTransferred(userId, PageRequest.of(0, 10)).stream()
            .map(p -> new EarningItem(p.getBooking().getBookingCode(), p.getAmount(), p.getPlatformFee(), p.getPaidAt()))
            .toList();
    }

    private static Money money(long amount, String currency) {
        return new Money(amount, currency, exponent(currency));
    }

    private static PayoutItem payoutItem(Payout po) {
        return new PayoutItem(po.getId(), po.getAmount(), po.getCurrency(), exponent(po.getCurrency()),
            po.getStatus(), po.getArrivalDate(), po.getCreated(), po.getFailureMessage());
    }

    private static int exponent(String currency) {
        return currency != null && ZERO_DECIMAL.contains(currency.toLowerCase()) ? 0 : 2;
    }
}
