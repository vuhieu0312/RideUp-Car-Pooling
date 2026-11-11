package com.rideup.repository;

import com.rideup.entity.DriverProfile;
import com.rideup.enums.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {

    Optional<DriverProfile> findByUserId(String userId);

    List<DriverProfile> findByStatus(DriverStatus status);

    boolean existsByCccd(String cccd);

    boolean existsByGplx(String gplx);

    boolean existsByCccdAndIdNot(String cccd, String id);

    boolean existsByGplxAndIdNot(String gplx, String id);

    @Query("select count(d) > 0 from DriverProfile d where d.user.id = :userId "
        + "and (d.cccdImageFront = :path or d.cccdImageBack = :path or d.gplxImage = :path)")
    boolean ownsDocument(@Param("userId") String userId, @Param("path") String path);
}
