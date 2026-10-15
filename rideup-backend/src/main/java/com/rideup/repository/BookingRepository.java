package com.rideup.repository;

import com.rideup.entity.Booking;
import com.rideup.enums.BookingStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, String> {

    Optional<Booking> findByBookingCode(String bookingCode);

    @EntityGraph(attributePaths = {"customer", "payment", "trip", "trip.startProvince", "trip.endProvince",
        "trip.driver", "trip.vehicle", "pickupWard", "dropoffWard"})
    List<Booking> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    List<Booking> findByTripId(String tripId);

    @EntityGraph(attributePaths = {"customer", "payment", "trip", "trip.startProvince", "trip.endProvince",
        "trip.driver", "trip.vehicle", "pickupWard", "dropoffWard"})
    List<Booking> findByTripIdAndStatusIn(String tripId, List<BookingStatus> statuses);

    long countByTripIdAndStatusIn(String tripId, List<BookingStatus> statuses);

    long countByCustomerIdAndStatusIn(String customerId, List<BookingStatus> statuses);

    List<Booking> findByStatusAndExpiresAtBefore(BookingStatus status, LocalDateTime time);

    boolean existsByCustomerIdAndTripIdAndStatusIn(String customerId, String tripId, List<BookingStatus> statuses);

    @EntityGraph(attributePaths = {"customer", "payment", "trip", "trip.startProvince", "trip.endProvince",
        "trip.driver", "trip.vehicle", "pickupWard", "dropoffWard"})
    @org.springframework.data.jpa.repository.Query(
        "SELECT b FROM Booking b WHERE b.trip.driver.id = :driverId ORDER BY b.createdAt DESC"
    )
    List<Booking> findAllByDriverId(@org.springframework.data.repository.query.Param("driverId") String driverId);

    @EntityGraph(attributePaths = {"customer", "payment", "trip", "trip.startProvince", "trip.endProvince",
        "trip.driver", "trip.vehicle", "pickupWard", "dropoffWard"})
    @org.springframework.data.jpa.repository.Query(
        "SELECT b FROM Booking b WHERE b.trip.driver.id = :driverId AND b.status IN :statuses ORDER BY b.createdAt DESC"
    )
    List<Booking> findByDriverIdAndStatusIn(
        @org.springframework.data.repository.query.Param("driverId") String driverId,
        @org.springframework.data.repository.query.Param("statuses") java.util.List<BookingStatus> statuses
    );
}
