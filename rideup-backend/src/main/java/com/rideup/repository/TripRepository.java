package com.rideup.repository;

import com.rideup.entity.Trip;
import com.rideup.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, String> {

    List<Trip> findByDriverIdOrderByDepartureTimeDesc(String driverId);

    List<Trip> findByDriverIdAndStatusIn(String driverId, List<TripStatus> statuses);

    List<Trip> findByStatusAndDepartureTimeBetween(TripStatus status, LocalDateTime from, LocalDateTime to);

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

    /**
     * Dùng OPTIMISTIC lock (dựa trên {@code @Version} của {@link Trip}) thay
     * vì PESSIMISTIC để tránh giữ row quá lâu. Khi commit mà version đã bị
     * transaction khác cập nhật, Hibernate sẽ ném
     * {@link org.springframework.orm.ObjectOptimisticLockingFailureException}
     * — caller cần retry.
     *
     * <p>Vì sao KHÔNG dùng PESSIMISTIC_WRITE:
     * <ul>
     *   <li>Giữ row lock tới khi transaction commit → giảm concurrency</li>
     *   <li>Customer phải chờ trong khi transaction khác xử lý</li>
     *   <li>Với lượng truy cập lớn có thể gây lock contention / deadlock</li>
     * </ul>
     * </p>
     */
    @Lock(LockModeType.OPTIMISTIC)
    @Query("SELECT t FROM Trip t WHERE t.id = :id")
    java.util.Optional<Trip> findByIdForUpdate(@Param("id") String id);
}
