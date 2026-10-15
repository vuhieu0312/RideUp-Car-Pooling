package com.rideup.repository;

import com.rideup.entity.Trip;
import com.rideup.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, String> {

    @EntityGraph(attributePaths = {"driver"})
    List<Trip> findByDriverIdOrderByDepartureTimeDesc(String driverId);

    @EntityGraph(attributePaths = {"driver"})
    List<Trip> findByDriverIdAndStatusIn(String driverId, List<TripStatus> statuses);

    List<Trip> findByStatusAndDepartureTimeBetween(TripStatus status, LocalDateTime from, LocalDateTime to);

    @EntityGraph(attributePaths = {"driver"})
    @Query("""
                SELECT t FROM Trip t
                WHERE t.status = :status
                  AND t.startProvince.id = :startProvinceId
                  AND t.endProvince.id = :endProvinceId
                  AND t.departureTime BETWEEN :from AND :to
                  AND t.seatAvailable >= :seatRequired
                ORDER BY t.departureTime ASC
            """)
    List<Trip> searchTrips(
            @Param("status") TripStatus status,
            @Param("startProvinceId") String startProvinceId,
            @Param("endProvinceId") String endProvinceId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("seatRequired") Integer seatRequired);

    @EntityGraph(attributePaths = {"driver"})
    @Query("""
                SELECT DISTINCT t FROM Trip t
                JOIN t.stops pickupStop
                JOIN t.stops dropoffStop
                WHERE t.status = :status
                  AND t.startProvince.id = :startProvinceId
                  AND t.endProvince.id = :endProvinceId
                  AND pickupStop.stopType = com.rideup.enums.StopType.PICKUP
                  AND pickupStop.ward.id = :startWardId
                  AND dropoffStop.stopType = com.rideup.enums.StopType.DROPOFF
                  AND dropoffStop.ward.id = :endWardId
                  AND t.departureTime BETWEEN :from AND :to
                ORDER BY t.departureTime ASC
            """)
    List<Trip> searchTripsByRouteAndWards(
            @Param("status") TripStatus status,
            @Param("startProvinceId") String startProvinceId,
            @Param("endProvinceId") String endProvinceId,
            @Param("startWardId") String startWardId,
            @Param("endWardId") String endWardId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
