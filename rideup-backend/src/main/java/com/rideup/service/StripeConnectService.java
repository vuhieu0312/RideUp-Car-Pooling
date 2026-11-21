package com.rideup.service;

import com.rideup.config.PlatformFee;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Payment;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import com.rideup.enums.PayoutStatus;
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

// số tiền luôn tính ở server từ giao dịch thật của Stripe, không nhận từ client
@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StripeConnectService {

    private static final List<PayoutStatus> DONE = List.of(PayoutStatus.COMPLETED, PayoutStatus.OFFSET_BY_DEBT);

    final DriverProfileRepository driverProfileRepository;
    final PaymentRepository paymentRepository;
    final DriverService driverService;
    final WalletService walletService;
    final PlatformFee platformFee;

    @Value("${stripe.connect.country:US}")
    String country;

    @Value("${stripe.connect.return-base-url:}")
    String returnBaseUrl;


    public record EarningItem(String bookingCode, BigDecimal fare, BigDecimal platformFee, BigDecimal debtDeducted, LocalDateTime paidAt) {}

    public record Summary(boolean configured, boolean hasAccount, boolean detailsSubmitted,
                          boolean payoutsEnabled, boolean transfersActive,
                          List<EarningItem> earnings,
                          int feePercent, int waitingTransfers) {}

    public record OnboardingLink(String url) {}


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
        // key theo phút để chống bấm đúp, Stripe không phát lại lỗi cũ trong 24h
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

        enableAutoPayout(account);
        log.info("Đã tạo tài khoản Stripe Connect {} cho driverProfile={}", account.getId(), profile.getId());
        return account.getId();
    }


    // gọi sau khi capture, chưa có tài khoản thì chuyển bù khi tài xế mở ví
    public void transferAfterCapture(Payment payment) {
        try {
            driverProfileRepository.findByUserId(payment.getBooking().getTrip().getDriver().getId())
                .ifPresent(profile -> transferToDriver(payment, profile));
        } catch (RuntimeException e) {
            log.warn("Chưa chuyển được tiền cho tài xế (payment={}): {}", payment.getId(), e.getMessage());
        }
    }

    // không @Transactional và tự bắt mọi lỗi để lỗi Stripe không làm hỏng việc kết thúc chuyến
    public boolean transferToDriver(Payment payment, DriverProfile profile) {
        String accountId = accountOf(profile);
        if (accountId == null || !isConfigured() || payment.getMethod() != PaymentMethod.STRIPE
            || payment.getStatus() != PaymentStatus.PAID || payment.getTransactionId() == null) {
            return false;
        }
        try {
            String chargeId = PaymentIntent.retrieve(payment.getTransactionId()).getLatestCharge();
            if (chargeId == null) return false;
            // transfer có source_transaction phải cùng tiền tệ với khoản thu nên tính trên balance transaction
            BalanceTransaction bt = BalanceTransaction.retrieve(Charge.retrieve(chargeId).getBalanceTransaction());
            startPayout(payment, profile);
            if (DONE.contains(payment.getPayoutStatus())) return true;

            BigDecimal net = payment.getAmount().subtract(payment.getCommissionAmount());
            long driverShare = BigDecimal.valueOf(bt.getAmount()).multiply(net)
                .divide(payment.getAmount(), 0, RoundingMode.DOWN).longValue();
            if (driverShare <= 0) return false;

            long transferAmount = net.signum() <= 0 ? 0
                : BigDecimal.valueOf(driverShare)
                    .multiply(net.subtract(payment.getDebtDeducted()))
                    .divide(net, 0, RoundingMode.DOWN)
                    .longValue();

            if (transferAmount <= 0) {
                payment.setPayoutStatus(PayoutStatus.OFFSET_BY_DEBT);
                paymentRepository.save(payment);
                log.info("Thu nhập chuyến {} được bù hết vào nợ hoa hồng (payment={})",
                    payment.getBooking().getBookingCode(), payment.getId());
                return true;
            }

            Transfer transfer = Transfer.create(TransferCreateParams.builder()
                    .setAmount(transferAmount)
                    .setCurrency(bt.getCurrency())
                    .setDestination(accountId)
                    .setSourceTransaction(chargeId)
                    .setTransferGroup("booking_" + payment.getBooking().getId())
                    .putMetadata("paymentId", payment.getId())
                    .putMetadata("bookingCode", String.valueOf(payment.getBooking().getBookingCode()))
                    .build(),
                RequestOptions.builder().setIdempotencyKey("connect-transfer-" + payment.getId()).build());

            payment.setStripeTransferId(transfer.getId());
            payment.setPayoutStatus(PayoutStatus.COMPLETED);
            paymentRepository.save(payment);
            log.info("Đã chuyển {} {} cho tài khoản {} (payment={}, transfer={}, trừ nợ={})",
                transferAmount, bt.getCurrency(), accountId, payment.getId(), transfer.getId(),
                payment.getDebtDeducted());
            payoutNow(accountId);
            return true;
        } catch (StripeException | RuntimeException e) {
            log.warn("Chuyển tiền cho tài xế thất bại (payment={}), sẽ thử lại sau: {}", payment.getId(), e.getMessage());
            if (payment.getCommissionAmount() != null) {
                try {
                    payment.setPayoutStatus(PayoutStatus.FAILED);
                    paymentRepository.save(payment);
                } catch (RuntimeException ignored) {
                    log.warn("Không ghi được trạng thái lỗi payout (payment={})", payment.getId());
                }
            }
            return false;
        }
    }

    private void enableAutoPayout(Account account) {
        try {
            account.update(AccountUpdateParams.builder()
                .setSettings(AccountUpdateParams.Settings.builder()
                    .setPayouts(AccountUpdateParams.Settings.Payouts.builder()
                        .setSchedule(AccountUpdateParams.Settings.Payouts.Schedule.builder()
                            .setInterval(AccountUpdateParams.Settings.Payouts.Schedule.Interval.DAILY)
                            .build())
                        .build())
                    .build())
                .build());
        } catch (StripeException e) {
            log.warn("Không đặt được chi trả tự động cho {}: {}", account.getId(), e.getMessage());
        }
    }

    private boolean isManualSchedule(Account account) {
        return account.getSettings() != null && account.getSettings().getPayouts() != null
            && account.getSettings().getPayouts().getSchedule() != null
            && "manual".equals(account.getSettings().getPayouts().getSchedule().getInterval());
    }

    private void payoutNow(String accountId) {
        try {
            if (!Boolean.TRUE.equals(Account.retrieve(accountId).getPayoutsEnabled())) return;
            RequestOptions asDriver = RequestOptions.builder().setStripeAccount(accountId).build();
            Balance.Available avail = Balance.retrieve(asDriver).getAvailable().stream()
                .filter(b -> b.getAmount() != null && b.getAmount() > 0)
                .findFirst().orElse(null);
            if (avail == null) return;
            Payout payout = Payout.create(PayoutCreateParams.builder()
                .setAmount(avail.getAmount())
                .setCurrency(avail.getCurrency())
                .build(), asDriver);
            log.info("Tự động chi trả {} {} cho tài khoản {} (payout={}, {})", avail.getAmount(),
                avail.getCurrency(), accountId, payout.getId(), payout.getStatus());
        } catch (StripeException | RuntimeException e) {
            log.warn("Chưa tự động chi trả được cho tài khoản {}: {}", accountId, e.getMessage());
        }
    }

    private void startPayout(Payment payment, DriverProfile profile) {
        if (payment.getCommissionAmount() != null) return;
        BigDecimal commission = platformFee.of(payment.getAmount());
        BigDecimal deducted = walletService.offsetDebt(
            profile.getUser().getId(), payment.getAmount().subtract(commission), payment.getBooking().getId());
        payment.setCommissionAmount(commission);
        payment.setDebtDeducted(deducted);
        payment.setPayoutStatus(PayoutStatus.PENDING);
        paymentRepository.save(payment);
    }


    @Transactional
    public Summary getSummary(String userId) {
        DriverProfile profile = driverService.requireApprovedDriver(userId);
        String accountId = accountOf(profile);
        List<Payment> waiting = paymentRepository.findUntransferred(userId, PaymentMethod.STRIPE, PaymentStatus.PAID, DONE);

        if (!isConfigured() || accountId == null) {
            return new Summary(isConfigured(), false, false, false, false,
                earnings(userId), platformFee.getPercent(), waiting.size());
        }
        try {
            Account account = Account.retrieve(accountId);
            if (isManualSchedule(account)) enableAutoPayout(account);
            boolean transfersActive = account.getCapabilities() != null
                && "active".equals(account.getCapabilities().getTransfers());
            int stillWaiting = transfersActive
                ? (int) waiting.stream().filter(p -> !transferToDriver(p, profile)).count()
                : waiting.size();

            return new Summary(true, true,
                Boolean.TRUE.equals(account.getDetailsSubmitted()),
                Boolean.TRUE.equals(account.getPayoutsEnabled()),
                transfersActive,
                earnings(userId), platformFee.getPercent(), stillWaiting);
        } catch (StripeException e) {
            log.error("Đọc ví Stripe Connect lỗi (driver={}): {}", profile.getId(), e.getMessage());
            throw AppException.badRequest("Không đọc được số dư từ Stripe: " + e.getMessage());
        }
    }


    private static boolean isConfigured() {
        return StringUtils.hasText(Stripe.apiKey);
    }

    private static void requireConfigured() {
        if (!isConfigured()) throw new AppException(ErrorCode.STRIPE_NOT_CONFIGURED);
    }

    private static String accountOf(DriverProfile profile) {
        return StringUtils.hasText(profile.getStripeAccountId()) ? profile.getStripeAccountId() : null;
    }

    private List<EarningItem> earnings(String userId) {
        List<Payment> payments = paymentRepository.findTransferred(userId, DONE, PageRequest.of(0, 10));
        return payments.stream()
            .map(p -> new EarningItem(p.getBooking().getBookingCode(), p.getAmount(),
                p.getCommissionAmount(), p.getDebtDeducted(), p.getPaidAt()))
            .toList();
    }
}
