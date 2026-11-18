package com.rideup.service;

import com.rideup.dto.response.DriverDetailResponse;
import com.rideup.dto.response.DriverResponse;
import com.rideup.dto.response.AdminDashboardStats;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.User;
import com.rideup.entity.Vehicle;
import com.rideup.entity.Trip;
import com.rideup.entity.Booking;
import com.rideup.entity.Payment;
import com.rideup.entity.Report;
import com.rideup.enums.DriverStatus;
import com.rideup.enums.NotificationType;
import com.rideup.enums.Role;
import com.rideup.enums.TripStatus;
import com.rideup.enums.PaymentStatus;
import com.rideup.enums.AccountStatus;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.ReportStatus;
import com.rideup.exception.AppException;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.UserRepository;
import com.rideup.repository.VehicleRepository;
import com.rideup.repository.TripRepository;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.PaymentRepository;
import com.rideup.repository.ReportRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
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
import java.util.Comparator;
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

    private DriverProfile requireProfile(String driverProfileId) {
        return driverProfileRepository.findById(driverProfileId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ tài xế"));
    }

    @Transactional(readOnly = true)
    public AdminDashboardStats getDashboardStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from30 = now.minusDays(30);
        LocalDateTime fromYear = now.minusYears(1);
        List<User> users = userRepository.findAll();
        List<Trip> trips = tripRepository.findAll();
        List<Booking> bookings = bookingRepository.findAll();
        List<Payment> payments = paymentRepository.findAll();
        List<Report> reports = reportRepository.findAll();
        List<DriverProfile> profiles = driverProfileRepository.findAll();

        List<User> customers = users.stream()
                .filter(u -> u.getRole() == Role.CUSTOMER).toList();
        List<User> drivers = users.stream()
                .filter(u -> u.getRole() == Role.DRIVER).toList();

        long tripCompleted = trips.stream().filter(t -> t.getStatus() == TripStatus.COMPLETED).count();
        long tripCanceled = trips.stream().filter(t -> t.getStatus() == TripStatus.CANCELED).count();
        List<Payment> paid = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID).toList();
        BigDecimal revenue = paid.stream()
                .map(Payment::getAmount).filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fee = paid.stream()
                .map(Payment::getPlatformFee).filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Long> tripTimeline = trips.stream()
                .filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isBefore(fromYear))
                .collect(Collectors.groupingBy(t -> t.getCreatedAt().format(formatter), Collectors.counting()));
        Map<String, BigDecimal> revenueTimeline = paid.stream()
                .filter(p -> p.getPaidAt() != null && !p.getPaidAt().isBefore(fromYear))
                .collect(Collectors.groupingBy(p -> p.getPaidAt().format(formatter),
                        Collectors.reducing(BigDecimal.ZERO, Payment::getAmount,
                                (a, b) -> a == null ? b : (b == null ? a : a.add(b)))));
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

        Map<String, Long> tripsByDriver = trips.stream()
                .collect(Collectors.groupingBy(t -> t.getDriver().getFullName(), Collectors.counting()));
        Map<String, BigDecimal> revenueByDriver = new HashMap<>();
        for (Payment p : paid) {
            if (p.getBooking() == null || p.getBooking().getTrip() == null)
                continue;
            String name = p.getBooking().getTrip().getDriver().getFullName();
            revenueByDriver.merge(name, p.getAmount() == null ? BigDecimal.ZERO : p.getAmount(),
                    BigDecimal::add);
        }
        List<Map<String, Object>> byDriver = revenueByDriver.entrySet().stream()
                .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("value", e.getValue());
                    return m;
                })
                .toList();
        List<Map<String, Object>> topDrivers = tripsByDriver.entrySet().stream()
                .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("trips", e.getValue());
                    return m;
                })
                .toList();

        Map<String, Long> bookingsByCustomer = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getCustomer().getFullName(), Collectors.counting()));
        List<Map<String, Object>> topCustomers = bookingsByCustomer.entrySet().stream()
                .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("trips", e.getValue());
                    return m;
                })
                .toList();

        long newCustomers = customers.stream()
                .filter(u -> u.getCreatedAt() != null && !u.getCreatedAt().isBefore(from30)).count();
        long newDrivers = profiles.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(from30)).count();
        long activeDrivers = drivers.stream()
                .filter(u -> u.getAccountStatus() == AccountStatus.ACTIVE).count();
        long activeCustomers = bookings.stream()
                .filter(b -> b.getCreatedAt() != null && !b.getCreatedAt().isBefore(from30)
                        && b.getStatus() != BookingStatus.CANCELLED_BY_USER
                        && b.getStatus() != BookingStatus.CANCELLED_BY_DRIVER)
                .map(b -> b.getCustomer().getId()).distinct().count();
        double averageRating = profiles.stream()
                .filter(p -> p.getDriverRating() != null)
                .map(DriverProfile::getDriverRating)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(profiles.isEmpty() ? BigDecimal.ONE : BigDecimal.valueOf(profiles.size()), 2,
                        java.math.RoundingMode.HALF_UP)
                .doubleValue();

        Map<String, Long> reportStatus = new LinkedHashMap<>();
        for (ReportStatus status : ReportStatus.values()) {
            reportStatus.put(status.name(), reports.stream().filter(r -> r.getStatus() == status).count());
        }
        Map<String, Long> reportTarget = new LinkedHashMap<>();
        reportTarget.put("CUSTOMER",
                reports.stream().filter(r -> r.getReportedUser().getRole() == Role.CUSTOMER).count());
        reportTarget.put("DRIVER",
                reports.stream().filter(r -> r.getReportedUser().getRole() == Role.DRIVER).count());

        return AdminDashboardStats.builder()
                .totalUsers(users.stream().filter(u -> u.getRole() != Role.ADMIN).count())
                .totalTrips(trips.size())
                .totalRevenue(revenue)
                .platformFee(fee)
                .trips(AdminDashboardStats.TripStats.builder().total(trips.size()).completed(tripCompleted)
                        .canceled(tripCanceled).timeline(tripTimelineList).build())
                .revenue(AdminDashboardStats.RevenueStats.builder().total(revenue).platformFee(fee)
                        .timeline(revenueTimelineList).byDriver(byDriver).build())
                .drivers(AdminDashboardStats.DriverStats.builder().total(drivers.size()).newDrivers(newDrivers)
                        .activeDrivers(activeDrivers).averageRating(averageRating).topActive(topDrivers).build())
                .customers(AdminDashboardStats.CustomerStats.builder().total(customers.size())
                        .newCustomers(newCustomers).activeCustomers(activeCustomers).topCustomers(topCustomers).build())
                .reports(AdminDashboardStats.ReportStats.builder().total(reports.size()).byStatus(reportStatus)
                        .byTarget(reportTarget).build())
                .build();
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
