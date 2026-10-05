package com.rideup.repository;

import com.rideup.entity.DriverProfile;
import com.rideup.enums.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {

    Optional<DriverProfile> findByUserId(String userId);

    List<DriverProfile> findByStatus(DriverStatus status);

    /**
     * Batch fetch rating của nhiều driver — tránh N+1 khi tính weighted score.
     */
    List<DriverProfile> findByUserIdIn(java.util.Collection<String> userIds);

    boolean existsByCccd(String cccd);

    boolean existsByGplx(String gplx);
}
