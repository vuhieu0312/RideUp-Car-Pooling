package com.rideup.service;

import com.rideup.dto.request.CreateReportRequest;
import com.rideup.dto.response.ReportResponse;
import com.rideup.entity.Booking;
import com.rideup.entity.Report;
import com.rideup.entity.User;
import com.rideup.enums.AccountStatus;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.ReportStatus;
import com.rideup.exception.AppException;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.ReportRepository;
import com.rideup.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportService {

    final ReportRepository reportRepository;
    final BookingRepository bookingRepository;
    final UserRepository userRepository;

    @Value("${app.report.violation-threshold:5}")
    int violationThreshold;

    @Transactional
    public ReportResponse create(String reporterId, CreateReportRequest request) {
        User reporter = userRepository.findById(reporterId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy người gửi khiếu nại"));
        User reportedUser = userRepository.findById(request.getReportedUserId())
            .orElseThrow(() -> AppException.notFound("Không tìm thấy người bị khiếu nại"));
        Booking booking = bookingRepository.findById(request.getBookingId())
            .orElseThrow(() -> AppException.notFound("Không tìm thấy booking"));

        if (reporter.getId().equals(reportedUser.getId())) {
            throw AppException.badRequest("Bạn không thể khiếu nại chính mình");
        }

        boolean reporterIsCustomer = booking.getCustomer().getId().equals(reporterId);
        boolean reporterIsDriver = booking.getTrip().getDriver().getId().equals(reporterId);
        boolean reportedIsCustomer = booking.getCustomer().getId().equals(reportedUser.getId());
        boolean reportedIsDriver = booking.getTrip().getDriver().getId().equals(reportedUser.getId());
        if ((!reporterIsCustomer && !reporterIsDriver)
            || (!reportedIsCustomer && !reportedIsDriver)) {
            throw AppException.forbidden("Chỉ người tham gia chuyến xe mới có thể khiếu nại lẫn nhau");
        }
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw AppException.badRequest("Chỉ có thể khiếu nại sau khi chuyến xe hoàn thành");
        }

        if (reportRepository.existsByReporterIdAndBookingIdAndReportedUserId(
            reporterId, booking.getId(), reportedUser.getId())) {
            throw AppException.conflict("Bạn đã gửi khiếu nại cho người này trong chuyến xe này");
        }

        Report report = Report.builder()
            .reporter(reporter)
            .reportedUser(reportedUser)
            .booking(booking)
            .category(request.getCategory())
            .title(request.getTitle().trim())
            .description(request.getDescription().trim())
            .evidenceUrl(request.getEvidenceUrl())
            .status(ReportStatus.PENDING)
            .build();

        return toResponse(reportRepository.save(report));
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> list(ReportStatus status) {
        List<Report> reports = status == null
            ? reportRepository.findAllByOrderByCreatedAtDesc()
            : reportRepository.findByStatusOrderByCreatedAtDesc(status);
        return reports.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> listSubmitted(String userId) {
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(userId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> listReceived(String userId) {
        return reportRepository.findByReportedUserIdOrderByCreatedAtDesc(userId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ReportResponse review(String reportId, String adminId, ReportStatus decision) {
        if (decision != ReportStatus.APPROVED && decision != ReportStatus.REJECTED) {
            throw AppException.badRequest("Trạng thái xử lý phải là APPROVED hoặc REJECTED");
        }

        Report report = reportRepository.findForUpdateById(reportId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy khiếu nại"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw AppException.conflict("Khiếu nại đã được xử lý trước đó");
        }

        User admin = userRepository.findById(adminId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy Admin"));
        report.setStatus(decision);
        report.setHandledBy(admin);
        report.setHandledAt(LocalDateTime.now());

        if (decision == ReportStatus.APPROVED) {
            User reportedUser = userRepository.findByIdForUpdate(report.getReportedUser().getId())
                .orElseThrow(() -> AppException.notFound("Không tìm thấy người bị khiếu nại"));
            int violationCount = reportedUser.getViolationCount() + 1;
            reportedUser.setViolationCount(violationCount);
            if (violationCount >= violationThreshold
                && reportedUser.getAccountStatus() == AccountStatus.ACTIVE) {
                reportedUser.setAccountStatus(AccountStatus.LOCKED);
            }
            log.info("Report {} approved by {}; user {} violation count={}/{} account status={}",
                reportId, adminId, reportedUser.getId(), violationCount, violationThreshold,
                reportedUser.getAccountStatus());
        }

        return toResponse(reportRepository.save(report));
    }

    private ReportResponse toResponse(Report report) {
        User reportedUser = report.getReportedUser();
        return ReportResponse.builder()
            .id(report.getId())
            .reporterId(report.getReporter().getId())
            .reporterName(report.getReporter().getFullName())
            .reportedUserId(reportedUser.getId())
            .reportedUserName(reportedUser.getFullName())
            .violationCount(reportedUser.getViolationCount())
            .accountStatus(reportedUser.getAccountStatus())
            .bookingId(report.getBooking().getId())
            .bookingCode(report.getBooking().getBookingCode())
            .tripId(report.getBooking().getTrip().getId())
            .category(report.getCategory())
            .title(report.getTitle())
            .description(report.getDescription())
            .evidenceUrl(report.getEvidenceUrl())
            .status(report.getStatus())
            .handledById(report.getHandledBy() == null ? null : report.getHandledBy().getId())
            .handledByName(report.getHandledBy() == null ? null : report.getHandledBy().getFullName())
            .handledAt(report.getHandledAt())
            .createdAt(report.getCreatedAt())
            .build();
    }
}
