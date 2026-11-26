package com.rideup.service;

import com.rideup.dto.response.DriverDetailResponse;
import com.rideup.dto.response.DriverResponse;
import com.rideup.dto.response.AdminUserResponse;
import com.rideup.dto.response.AdminDashboardStats;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.User;
import com.rideup.entity.Vehicle;
import com.rideup.enums.Gender;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.NotificationType;
import com.rideup.enums.Role;
import com.rideup.enums.TripStatus;
import com.rideup.enums.PaymentStatus;
import com.rideup.enums.AccountStatus;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.ReportStatus;
import com.rideup.exception.AppException;
import com.rideup.config.PlatformFee;
import com.rideup.config.WalletSettings;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.UserRepository;
import com.rideup.repository.VehicleRepository;
import com.rideup.repository.TripRepository;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.PaymentRepository;
import com.rideup.repository.ReportRepository;
import com.rideup.repository.AdminUserProjection;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminService {

    DriverProfileRepository driverProfileRepository;
    VehicleRepository vehicleRepository;
    UserRepository userRepository;
    VehicleService vehicleService;
    TripRepository tripRepository;
    BookingRepository bookingRepository;
    PaymentRepository paymentRepository;
    PlatformFee platformFee;
    WalletSettings walletSettings;
    ReportRepository reportRepository;
    MailService mailService;
    RealtimeService realtimeService;

    @Transactional(readOnly = true)
    public List<DriverResponse> listDrivers(DriverStatus status) {
        List<DriverProfile> profiles = (status == null)
                ? driverProfileRepository.findAll()
                : driverProfileRepository.findByStatus(status);
        return profiles.stream().map(p -> DriverService.toResponse(p, null)).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listManagedUsers(Role role) {
        requireManagedRole(role);
        return userRepository.findAdminAccountsByRole(role.name()).stream()
                .map(this::toAdminUserResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminUserResponse getManagedUser(String userId) {
        return userRepository.findAdminAccountById(userId)
                .map(this::toAdminUserResponse)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy người dùng"));
    }

    @Transactional
    public void updateAccountStatus(String userId, AccountStatus status, String adminUserId) {
        if (status == null) {
            throw AppException.badRequest("Trạng thái tài khoản là bắt buộc");
        }
        AdminUserResponse user = getManagedUser(userId);
        int updated = userRepository.updateManagedAccountStatus(userId, status.name());
        if (updated != 1) {
            throw AppException.notFound("Không tìm thấy người dùng");
        }
        log.info("Admin {} changed account status user={} {} -> {}",
                adminUserId, userId, user.getAccountStatus(), status);
        realtimeService.adminQueueChanged();
    }

    @Transactional(readOnly = true)
    public DriverDetailResponse getDriverDetail(String driverProfileId) {
        DriverProfile profile = requireProfile(driverProfileId);
        List<Vehicle> vehicles = vehicleRepository.findByDriverProfileIdOrderByCreatedAtDesc(profile.getId());
        Vehicle vehicle = vehicleRepository
                .findCurrentVehicle(profile.getId(), profile.getStatus() == DriverStatus.APPROVED)
                .orElse(null);

        return DriverDetailResponse.builder()
                .driver(DriverService.toResponse(profile, null))
                .vehicle(vehicle == null ? null : VehicleService.toResponse(vehicle))
                .vehicles(vehicles.stream().map(VehicleService::toResponse).toList())
                .driverReviewedByName(userName(profile.getApprovedBy()))
                .vehicleReviewedByName(vehicle == null ? null : userName(vehicle.getApprovedBy()))
                .accountCreatedAt(profile.getUser().getCreatedAt())
                .warnings(buildWarnings(profile, vehicle))
                .build();
    }

    @Transactional
    public DriverResponse approve(String driverProfileId, String adminUserId) {
        DriverProfile profile = requireProfile(driverProfileId);
        if (profile.getStatus() == DriverStatus.APPROVED) {
            throw AppException.badRequest("Hồ sơ đã được duyệt trước đó");
        }

        profile.setStatus(DriverStatus.APPROVED);
        profile.setApprovedAt(LocalDateTime.now(TripService.VN_ZONE));
        profile.setApprovedBy(adminUserId);
        profile.setRejectedAt(null);
        profile.setRejectionReason(null);
        profile = driverProfileRepository.save(profile);

        vehicleRepository.findFirstByDriverProfileIdAndIsVerifiedFalseAndRejectedAtIsNull(profile.getId())
                .ifPresent(v -> vehicleService.activate(v, adminUserId));

        log.info("Admin {} approved driverProfile={} userId={}",
                adminUserId, profile.getId(), profile.getUser().getId());
        User u = profile.getUser();
        mailService.sendDriverApproved(u.getEmail(), u.getFullName());
        realtimeService.notifyUser(u, NotificationType.DRIVER_APPROVED, "Hồ sơ tài xế đã được duyệt",
                "Bạn có thể bắt đầu tạo chuyến đi.", null, null, null);
        realtimeService.driverProfileChanged(profile);
        realtimeService.vehicleChanged(u.getId());
        realtimeService.adminQueueChanged();
        return DriverService.toResponse(profile, null);
    }

    @Transactional
    public DriverResponse reject(String driverProfileId, String adminUserId, String reason) {
        DriverProfile profile = requireProfile(driverProfileId);
        if (profile.getStatus() == DriverStatus.REJECTED) {
            throw AppException.badRequest("Hồ sơ đã bị từ chối trước đó");
        }

        profile.setStatus(DriverStatus.REJECTED);
        profile.setRejectedAt(LocalDateTime.now(TripService.VN_ZONE));
        profile.setRejectionReason(reason);
        profile.setApprovedAt(null);
        profile.setApprovedBy(null);
        profile = driverProfileRepository.save(profile);

        vehicleRepository.findFirstByDriverProfileIdAndIsVerifiedFalseAndRejectedAtIsNull(profile.getId())
                .ifPresent(v -> vehicleService.markRejected(v, reason));

        log.info("Admin {} rejected driverProfile={} userId={} reason='{}'",
                adminUserId, profile.getId(), profile.getUser().getId(), reason);
        User u = profile.getUser();
        mailService.sendDriverRejected(u.getEmail(), u.getFullName(), reason);
        realtimeService.notifyUser(u, NotificationType.DRIVER_REJECTED, "Hồ sơ tài xế bị từ chối",
                "Lý do: " + reason + "\nHãy chỉnh sửa và gửi lại hồ sơ.", null, null, null);
        realtimeService.driverProfileChanged(profile);
        realtimeService.vehicleChanged(u.getId());
        realtimeService.adminQueueChanged();
        return DriverService.toResponse(profile, null);
    }

    @Transactional
    public void unlockUser(String userId, String adminUserId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy người dùng"));
        if (user.getAccountStatus() != AccountStatus.LOCKED) {
            throw AppException.badRequest("Tài khoản không ở trạng thái bị khóa");
        }
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setViolationCount(0);
        userRepository.save(user);
        log.info("Admin {} unlocked user={}", adminUserId, userId);
        realtimeService.adminQueueChanged();
    }

    public int getCommissionPercent() {
        return platformFee.getPercent();
    }

    public int updateCommissionPercent(int percent, String adminUserId) {
        int old = platformFee.getPercent();
        platformFee.setPercent(percent);
        log.info("Admin {} đổi hoa hồng nền tảng {}% -> {}%", adminUserId, old, percent);
        return percent;
    }

    public long getDebtLimit() {
        return walletSettings.getDebtLimit();
    }

    public long updateDebtLimit(long limit, String adminUserId) {
        long old = walletSettings.getDebtLimit();
        walletSettings.setDebtLimit(limit);
        log.info("Admin {} đổi hạn mức nợ tài xế {} -> {}", adminUserId, old, limit);
        return limit;
    }

    private DriverProfile requireProfile(String driverProfileId) {
        return driverProfileRepository.findById(driverProfileId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ tài xế"));
    }

    private void requireManagedRole(Role role) {
        if (role != Role.CUSTOMER && role != Role.DRIVER) {
            throw AppException.badRequest("Chỉ hỗ trợ tài khoản khách hàng và tài xế");
        }
    }

    private AdminUserResponse toAdminUserResponse(AdminUserProjection user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender() == null ? null : Gender.valueOf(user.getGender()))
                .avatarUrl(user.getAvatarUrl())
                .role(Role.valueOf(user.getRole()))
                .accountStatus(AccountStatus.valueOf(user.getAccountStatus()))
                .violationCount(user.getViolationCount())
                .driverStatus(null)
                .driverRating(null)
                .totalDriverRides(null)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public AdminDashboardStats getDashboardStats() {
        LocalDateTime now = LocalDateTime.now(TripService.VN_ZONE);
        LocalDateTime from30 = now.minusDays(30);
        LocalDateTime fromYear = now.minusYears(1);
        PageRequest top10 = PageRequest.of(0, 10);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        long totalTrips = tripRepository.count();
        long tripCompleted = tripRepository.countByStatus(TripStatus.COMPLETED);
        long tripCanceled = tripRepository.countByStatus(TripStatus.CANCELED);
        BigDecimal revenue = orZero(paymentRepository.sumAmountByStatus(PaymentStatus.PAID));
        BigDecimal fee = orZero(paymentRepository.sumCommissionByStatus(PaymentStatus.PAID));

        Map<String, Long> tripTimeline = tripRepository.findCreatedAtSince(fromYear).stream()
                .collect(Collectors.groupingBy(createdAt -> createdAt.format(formatter), Collectors.counting()));
        Map<String, BigDecimal> revenueTimeline = new HashMap<>();
        for (Object[] row : paymentRepository.findPaidSince(PaymentStatus.PAID, fromYear)) {
            BigDecimal amount = (BigDecimal) row[1];
            if (amount != null) {
                revenueTimeline.merge(((LocalDateTime) row[0]).format(formatter), amount, BigDecimal::add);
            }
        }
        List<Map<String, Object>> tripTimelineList = new ArrayList<>();
        List<Map<String, Object>> revenueTimelineList = new ArrayList<>();
        for (int i = 365; i >= 0; i--) {
            String key = now.minusDays(i).format(formatter);
            Map<String, Object> tripPoint = new LinkedHashMap<>();
            tripPoint.put("date", key);
            tripPoint.put("value", tripTimeline.getOrDefault(key, 0L));
            tripTimelineList.add(tripPoint);
            Map<String, Object> revenuePoint = new LinkedHashMap<>();
            revenuePoint.put("date", key);
            revenuePoint.put("value", revenueTimeline.getOrDefault(key, BigDecimal.ZERO));
            revenueTimelineList.add(revenuePoint);
        }

        List<Map<String, Object>> byDriver = toTopRows(
                paymentRepository.findRevenueByDriver(PaymentStatus.PAID, top10), "value");
        List<Map<String, Object>> topDrivers = toTopRows(
                tripRepository.findTopDriversByCompletedTrips(top10), "trips");
        List<Map<String, Object>> topCustomers = toTopRows(
                bookingRepository.findTopCustomersByCompletedBookings(top10), "trips");

        long totalUsers = userRepository.countByRoleNot(Role.ADMIN);
        long driverTotal = userRepository.countByRole(Role.DRIVER);
        long customerTotal = userRepository.countByRole(Role.CUSTOMER);
        long newCustomers = userRepository.countByRoleAndCreatedAtGreaterThanEqual(Role.CUSTOMER, from30);
        long newDrivers = driverProfileRepository.countByCreatedAtGreaterThanEqual(from30);
        long activeDrivers = userRepository.countByRoleAndAccountStatus(Role.DRIVER, AccountStatus.ACTIVE);
        long activeCustomers = bookingRepository.countActiveCustomersSince(from30,
                List.of(BookingStatus.CANCELLED_BY_USER, BookingStatus.CANCELLED_BY_DRIVER));
        Double rating = driverProfileRepository.averageRatedDriverRating();
        double averageRating = rating == null ? 0
                : BigDecimal.valueOf(rating).setScale(2, java.math.RoundingMode.HALF_UP).doubleValue();

        Map<String, Long> reportStatus = new LinkedHashMap<>();
        for (ReportStatus status : ReportStatus.values()) {
            reportStatus.put(status.name(), 0L);
        }
        for (Object[] row : reportRepository.groupCountByStatus()) {
            reportStatus.put(((ReportStatus) row[0]).name(), ((Number) row[1]).longValue());
        }
        Map<String, Long> reportTarget = new LinkedHashMap<>();
        reportTarget.put(Role.CUSTOMER.name(), 0L);
        reportTarget.put(Role.DRIVER.name(), 0L);
        for (Object[] row : reportRepository.groupCountByReportedRole()) {
            Role role = (Role) row[0];
            if (reportTarget.containsKey(role.name())) {
                reportTarget.put(role.name(), ((Number) row[1]).longValue());
            }
        }

        return AdminDashboardStats.builder()
                .totalUsers(totalUsers)
                .totalTrips(totalTrips)
                .totalRevenue(revenue)
                .platformFee(fee)
                .trips(AdminDashboardStats.TripStats.builder().total(totalTrips).completed(tripCompleted)
                        .canceled(tripCanceled).timeline(tripTimelineList).build())
                .revenue(AdminDashboardStats.RevenueStats.builder().total(revenue).platformFee(fee)
                        .timeline(revenueTimelineList).byDriver(byDriver).build())
                .drivers(AdminDashboardStats.DriverStats.builder().total(driverTotal).newDrivers(newDrivers)
                        .activeDrivers(activeDrivers).averageRating(averageRating).topActive(topDrivers).build())
                .customers(AdminDashboardStats.CustomerStats.builder().total(customerTotal)
                        .newCustomers(newCustomers).activeCustomers(activeCustomers).topCustomers(topCustomers).build())
                .reports(AdminDashboardStats.ReportStats.builder().total(reportRepository.count())
                        .byStatus(reportStatus).byTarget(reportTarget).build())
                .build();
    }

    private static BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static List<Map<String, Object>> toTopRows(List<Object[]> rows, String valueKey) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row[0]);
            item.put("name", row[1]);
            item.put(valueKey, row[2]);
            result.add(item);
        }
        return result;
    }

    private DriverResponse toResponse(DriverProfile p) {
        User u = p.getUser();
        return DriverResponse.builder()
                .id(p.getId())
                .userId(u.getId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .cccd(p.getCccd())
                .cccdImageFront(p.getCccdImageFront())
                .cccdImageBack(p.getCccdImageBack())
                .gplx(p.getGplx())
                .gplxExpiryDate(p.getGplxExpiryDate())
                .gplxImage(p.getGplxImage())
                .driverRating(p.getDriverRating())
                .totalDriverRides(p.getTotalDriverRides())
                .status(p.getStatus())
                .approvedAt(p.getApprovedAt())
                .approvedBy(p.getApprovedBy())
                .rejectedAt(p.getRejectedAt())
                .rejectionReason(p.getRejectionReason())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private String userName(String userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    private List<String> buildWarnings(DriverProfile p, Vehicle v) {
        LocalDate today = LocalDate.now(TripService.VN_ZONE);
        List<String> warnings = new ArrayList<>();

        if (p.getStatus() == DriverStatus.PENDING && p.getRejectionReason() != null) {
            warnings.add("Hồ sơ gửi lại, lần trước bị từ chối vì: " + p.getRejectionReason());
        }
        if (p.getCccdImageFront() == null || p.getCccdImageBack() == null || p.getGplxImage() == null) {
            warnings.add("Hồ sơ tài xế thiếu ảnh giấy tờ");
        }
        addExpiryWarning(warnings, "GPLX", p.getGplxExpiryDate(), today);

        LocalDate dob = p.getUser().getDateOfBirth();
        if (dob != null && Period.between(dob, today).getYears() < 18) {
            warnings.add("Tài xế chưa đủ 18 tuổi");
        }

        if (v == null) {
            warnings.add("Tài xế chưa đăng ký phương tiện");
        } else {
            if (v.getVehicleImage() == null || v.getRegistrationImage() == null) {
                warnings.add("Phương tiện thiếu ảnh xe hoặc ảnh giấy đăng ký");
            }
            addExpiryWarning(warnings, "Đăng ký xe", v.getRegistrationExpiryDate(), today);
        }
        return warnings;
    }

    private void addExpiryWarning(List<String> warnings, String label, LocalDate expiry, LocalDate today) {
        if (expiry == null) {
            return;
        }
        if (expiry.isBefore(today)) {
            warnings.add(label + " đã hết hạn từ " + expiry);
        } else if (expiry.isBefore(today.plusDays(30))) {
            warnings.add(label + " sắp hết hạn (" + expiry + ")");
        }
    }
}
