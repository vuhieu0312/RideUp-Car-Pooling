package com.rideup.repository;

import com.rideup.entity.DriverProfile;
import com.rideup.enums.DriverStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {

    Optional<DriverProfile> findByUserId(String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from DriverProfile d where d.user.id = :userId")
    Optional<DriverProfile> findByUserIdForUpdate(@Param("userId") String userId);

    List<DriverProfile> findByStatus(DriverStatus status);

    long countByCreatedAtGreaterThanEqual(LocalDateTime from);

    // rating mặc định của hồ sơ mới là 0 (chưa có đánh giá) nên bỏ ra khỏi trung bình
    @Query("select avg(d.driverRating) from DriverProfile d where d.driverRating > 0")
    Double averageRatedDriverRating();

    boolean existsByCccd(String cccd);

    boolean existsByGplx(String gplx);

    boolean existsByCccdAndIdNot(String cccd, String id);

    boolean existsByGplxAndIdNot(String gplx, String id);

    @Query("select count(d) > 0 from DriverProfile d where d.user.id = :userId "
        + "and (d.cccdImageFront = :path or d.cccdImageBack = :path or d.gplxImage = :path)")
    boolean ownsDocument(@Param("userId") String userId, @Param("path") String path);
}
