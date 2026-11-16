package com.rideup.repository;

import com.rideup.entity.Report;
import com.rideup.enums.ReportStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, String> {

    @EntityGraph(attributePaths = {"reporter", "reportedUser", "handledBy", "booking", "booking.trip"})
    List<Report> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"reporter", "reportedUser", "handledBy", "booking", "booking.trip"})
    List<Report> findByStatusOrderByCreatedAtDesc(ReportStatus status);

    @EntityGraph(attributePaths = {"reporter", "reportedUser", "handledBy", "booking", "booking.trip"})
    List<Report> findByReporterIdOrderByCreatedAtDesc(String reporterId);

    @EntityGraph(attributePaths = {"reporter", "reportedUser", "handledBy", "booking", "booking.trip"})
    List<Report> findByReportedUserIdOrderByCreatedAtDesc(String reportedUserId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<Report> findForUpdateById(String id);

    boolean existsByReporterIdAndBookingIdAndReportedUserId(
        String reporterId,
        String bookingId,
        String reportedUserId
    );
}
