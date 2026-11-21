package com.rideup.service;

import com.rideup.config.PlatformFee;
import com.rideup.config.WalletSettings;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Payment;
import com.rideup.entity.WalletTransaction;
import com.rideup.enums.PayoutStatus;
import com.rideup.enums.WalletTransactionType;
import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.PaymentRepository;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.WalletTransactionRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WalletService {

    public static final String DEPOSIT_TYPE = "wallet_deposit";

    final DriverProfileRepository driverProfileRepository;
    final WalletTransactionRepository walletTransactionRepository;
    final PaymentRepository paymentRepository;
    final BookingRepository bookingRepository;
    final PlatformFee platformFee;
    final WalletSettings walletSettings;
    final DriverService driverService;

    @Value("${stripe.currency-code:vnd}")
    String currencyCode;

    @Value("${stripe.connect.return-base-url:}")
    String returnBaseUrl;

    @Value("${app.wallet.min-deposit-vnd:20000}")
    long minDeposit;

    @Value("${app.wallet.history-size:30}")
    int historySize;

    public record TransactionItem(String id, WalletTransactionType type, BigDecimal amount,
                                  BigDecimal balanceAfter, String bookingCode, LocalDateTime createdAt) {}

    public record Summary(BigDecimal balance, BigDecimal debt, int feePercent, long minDeposit, long debtLimit,
                          boolean depositEnabled, List<TransactionItem> transactions) {}

    public record DepositLink(String url, String sessionId, long amount) {}

    public record DepositIntent(String clientSecret, String paymentIntentId, long amount) {}

    @Transactional(readOnly = true)
    public Summary getSummary(String driverUserId) {
        DriverProfile profile = driverService.requireApprovedDriver(driverUserId);
        BigDecimal balance = balanceOf(profile);
        List<WalletTransaction> recent = walletTransactionRepository
            .findRecent(profile.getId(), PageRequest.of(0, historySize));
        List<TransactionItem> items = recent.stream()
            .map(t -> new TransactionItem(t.getId(), t.getType(), t.getAmount(), t.getBalanceAfter(),
                t.getBooking() == null ? null : t.getBooking().getBookingCode(), t.getCreatedAt()))
            .toList();
        return new Summary(balance, balance.signum() < 0 ? balance.negate() : BigDecimal.ZERO,
            platformFee.getPercent(), minDeposit, walletSettings.getDebtLimit(), StringUtils.hasText(Stripe.apiKey), items);
    }

    @Transactional(readOnly = true)
    public void requireWithinDebtLimit(String driverUserId) {
        BigDecimal limit = BigDecimal.valueOf(walletSettings.getDebtLimit());
        driverProfileRepository.findByUserId(driverUserId)
            .filter(p -> debtOf(balanceOf(p)).compareTo(limit) > 0)
            .ifPresent(p -> {
                throw new AppException(ErrorCode.WALLET_IN_DEBT);
            });
    }

    @Transactional
    public void accrueCashCommission(Payment payment, String driverUserId) {
        String bookingId = payment.getBooking().getId();
        if (walletTransactionRepository.existsByBookingId(bookingId)) {
            return;
        }
        BigDecimal fee = platformFee.of(payment.getAmount());
        if (fee.signum() <= 0) return;

        DriverProfile profile = driverProfileRepository.findByUserIdForUpdate(driverUserId)
            .orElseThrow(() -> AppException.forbidden("Tài khoản chưa đăng ký hồ sơ tài xế"));
        BigDecimal after = balanceOf(profile).subtract(fee);
        profile.setWalletBalance(after);
        driverProfileRepository.save(profile);
        walletTransactionRepository.save(WalletTransaction.builder()
            .driverProfile(profile)
            .type(WalletTransactionType.COMMISSION)
            .amount(fee.negate())
            .balanceAfter(after)
            .booking(payment.getBooking())
            .build());
        payment.setCommissionAmount(fee);
        payment.setDebtDeducted(BigDecimal.ZERO);
        payment.setPayoutStatus(PayoutStatus.CASH_COMMISSION);
        paymentRepository.save(payment);
        log.info("Hoa hồng tiền mặt {} cho driver {} (payment={}), số dư ví còn {}",
            fee, driverUserId, payment.getId(), after);
    }

    @Transactional
    public BigDecimal offsetDebt(String driverUserId, BigDecimal net, String bookingId) {
        DriverProfile profile = driverProfileRepository.findByUserIdForUpdate(driverUserId)
            .orElseThrow(() -> AppException.forbidden("Tài khoản chưa đăng ký hồ sơ tài xế"));
        BigDecimal balance = balanceOf(profile);
        BigDecimal debt = debtOf(balance);
        BigDecimal deducted = debt.min(net.max(BigDecimal.ZERO));
        if (deducted.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal after = balance.add(deducted);
        profile.setWalletBalance(after);
        driverProfileRepository.save(profile);
        walletTransactionRepository.save(WalletTransaction.builder()
            .driverProfile(profile)
            .type(WalletTransactionType.DEBT_OFFSET)
            .amount(deducted)
            .balanceAfter(after)
            .booking(bookingRepository.getReferenceById(bookingId))
            .build());
        log.info("Trừ nợ hoa hồng {} từ thu nhập booking {} của driver {}, số dư ví {}",
            deducted, bookingId, driverUserId, after);
        return deducted;
    }

    public DepositLink createDeposit(String driverUserId, Long requested, String apiBaseUrl) {
        requireStripe();
        DriverProfile profile = driverService.requireApprovedDriver(driverUserId);
        long amount = resolveAmount(profile, requested);

        String base = (StringUtils.hasText(returnBaseUrl) ? returnBaseUrl : apiBaseUrl).replaceAll("/+$", "");
        try {
            Session session = Session.create(SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(base + "/public/wallet/return")
                .setCancelUrl(base + "/public/wallet/cancel")
                .addLineItem(SessionCreateParams.LineItem.builder()
                    .setQuantity(1L)
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency(currencyCode.toLowerCase())
                        .setUnitAmount(amount)
                        .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName("Nạp ví hoa hồng RideUp")
                            .build())
                        .build())
                    .build())
                .putMetadata("type", DEPOSIT_TYPE)
                .putMetadata("userId", driverUserId)
                .putMetadata("driverProfileId", profile.getId())
                .build());
            return new DepositLink(session.getUrl(), session.getId(), amount);
        } catch (StripeException e) {
            log.error("Tạo phiên nạp ví lỗi (driver={}): {}", driverUserId, e.getMessage());
            throw AppException.badRequest("Không tạo được phiên nạp tiền: " + e.getMessage());
        }
    }

    public DepositIntent createDepositIntent(String driverUserId, Long requested) {
        requireStripe();
        DriverProfile profile = driverService.requireApprovedDriver(driverUserId);
        long amount = resolveAmount(profile, requested);
        try {
            PaymentIntent intent = PaymentIntent.create(PaymentIntentCreateParams.builder()
                .setAmount(amount)
                .setCurrency(currencyCode.toLowerCase())
                .setAutomaticPaymentMethods(PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                    .setEnabled(true)
                    .build())
                .setDescription("Nạp ví hoa hồng RideUp")
                .putMetadata("type", DEPOSIT_TYPE)
                .putMetadata("userId", driverUserId)
                .putMetadata("driverProfileId", profile.getId())
                .build());
            return new DepositIntent(intent.getClientSecret(), intent.getId(), amount);
        } catch (StripeException e) {
            log.error("Tạo PaymentIntent nạp ví lỗi (driver={}): {}", driverUserId, e.getMessage());
            throw AppException.badRequest("Không tạo được giao dịch nạp tiền: " + e.getMessage());
        }
    }

    @Transactional
    public Summary confirmDeposit(String driverUserId, String reference) {
        requireStripe();
        try {
            if (reference.startsWith("pi_")) {
                PaymentIntent intent = PaymentIntent.retrieve(reference);
                requireOwner(intent.getMetadata(), driverUserId);
                creditFromIntent(intent);
            } else {
                Session session = Session.retrieve(reference);
                requireOwner(session.getMetadata(), driverUserId);
                creditFromSession(session);
            }
        } catch (StripeException e) {
            log.error("Xác nhận nạp ví lỗi (ref={}): {}", reference, e.getMessage());
            throw AppException.badRequest("Không xác nhận được giao dịch nạp tiền: " + e.getMessage());
        }
        return getSummary(driverUserId);
    }

    @Transactional
    public void creditFromSession(Session session) {
        if (!isDeposit(session.getMetadata())) return;
        if (!"paid".equals(session.getPaymentStatus())) {
            throw new AppException(ErrorCode.WALLET_DEPOSIT_NOT_PAID);
        }
        credit(session.getMetadata().get("userId"), session.getId(), session.getAmountTotal());
    }

    @Transactional
    public void creditFromIntent(PaymentIntent intent) {
        if (!isDeposit(intent.getMetadata())) return;
        if (!"succeeded".equals(intent.getStatus())) {
            throw new AppException(ErrorCode.WALLET_DEPOSIT_NOT_PAID);
        }
        credit(intent.getMetadata().get("userId"), intent.getId(), intent.getAmountReceived());
    }

    public static boolean isDeposit(Map<String, String> metadata) {
        return metadata != null && DEPOSIT_TYPE.equals(metadata.get("type"));
    }

    private void credit(String userId, String reference, long amount) {
        if (walletTransactionRepository.existsByStripeReference(reference)) {
            return;
        }
        DriverProfile profile = driverProfileRepository.findByUserIdForUpdate(userId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ tài xế"));
        BigDecimal added = BigDecimal.valueOf(amount);
        BigDecimal after = balanceOf(profile).add(added);
        profile.setWalletBalance(after);
        driverProfileRepository.save(profile);
        walletTransactionRepository.save(WalletTransaction.builder()
            .driverProfile(profile)
            .type(WalletTransactionType.DEPOSIT)
            .amount(added)
            .balanceAfter(after)
            .stripeReference(reference)
            .build());
        log.info("Nạp ví {} cho driver {} (ref={}), số dư ví {}", added, userId, reference, after);
    }

    private long resolveAmount(DriverProfile profile, Long requested) {
        BigDecimal balance = balanceOf(profile);
        long debt = balance.signum() < 0 ? balance.negate().setScale(0, java.math.RoundingMode.CEILING).longValue() : 0;
        long amount = requested != null ? requested : Math.max(debt, minDeposit);
        if (amount < minDeposit) throw new AppException(ErrorCode.WALLET_DEPOSIT_TOO_SMALL);
        return amount;
    }

    private static void requireStripe() {
        if (!StringUtils.hasText(Stripe.apiKey)) throw new AppException(ErrorCode.STRIPE_NOT_CONFIGURED);
    }

    private static void requireOwner(Map<String, String> metadata, String driverUserId) {
        if (metadata == null || !driverUserId.equals(metadata.get("userId"))) {
            throw AppException.forbidden("Giao dịch nạp tiền không thuộc tài khoản này");
        }
    }

    private static BigDecimal debtOf(BigDecimal balance) {
        return balance.signum() < 0 ? balance.negate() : BigDecimal.ZERO;
    }

    private static BigDecimal balanceOf(DriverProfile profile) {
        return profile.getWalletBalance() == null ? BigDecimal.ZERO : profile.getWalletBalance();
    }
}
