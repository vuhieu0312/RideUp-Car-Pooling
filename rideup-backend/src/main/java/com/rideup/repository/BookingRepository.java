package com.rideup.repository;

import com.rideup.entity.Booking;
import com.rideup.enums.BookingStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, String> {

    @EntityGraph(attributePaths = {"customer", "payment", "trip", "trip.startProvince", "trip.endProvince",
        "trip.driver", "trip.vehicle", "pickupWard", "dropoffWard"})
    List<Booking> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    @EntityGraph(attributePaths = { "customer", "trip", "trip.driver" })
    List<Booking> findByCustomerIdAndStatusOrderByCreatedAtDesc(String customerId, BookingStatus status);

    List<Booking> findByTripId(String tripId);

    @org.springframework.data.jpa.repository.Query("""
                SELECT c.id, c.fullName, COUNT(b)
                FROM Booking b JOIN b.customer c
                WHERE b.status = com.rideup.enums.BookingStatus.COMPLETED
                GROUP BY c.id, c.fullName
                ORDER BY COUNT(b) DESC
            """)
    List<Object[]> findTopCustomersByCompletedBookings(Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        "SELECT COUNT(DISTINCT b.customer.id) FROM Booking b "
            + "WHERE b.createdAt >= :from AND b.status NOT IN :excluded"
    )
    long countActiveCustomersSince(
        @org.springframework.data.repository.query.Param("from") LocalDateTime from,
        @org.springframework.data.repository.query.Param("excluded") Collection<BookingStatus> excluded
    );

    @EntityGraph(attributePaths = {"customer", "payment", "trip", "trip.startProvince", "trip.endProvince",
        "trip.driver", "trip.vehicle", "pickupWard", "dropoffWard"})
    List<Booking> findByTripIdAndStatusIn(String tripId, List<BookingStatus> statuses);

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
