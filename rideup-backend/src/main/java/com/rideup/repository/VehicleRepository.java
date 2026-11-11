package com.rideup.repository;

import com.rideup.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {

    List<Vehicle> findByDriverProfileIdOrderByCreatedAtDesc(String driverProfileId);

    Optional<Vehicle> findFirstByDriverProfileIdOrderByCreatedAtDesc(String driverProfileId);

    Optional<Vehicle> findFirstByDriverProfileIdAndIsVerifiedTrueAndIsActiveTrue(String driverProfileId);

    Optional<Vehicle> findFirstByDriverProfileIdAndIsVerifiedFalseAndRejectedAtIsNull(String driverProfileId);

    Optional<Vehicle> findFirstByDriverProfileIdAndIsVerifiedFalseOrderByCreatedAtDesc(String driverProfileId);

    List<Vehicle> findByIsVerifiedFalseAndRejectedAtIsNull();

    @Query("select count(v) > 0 from Vehicle v where v.plateNumber = :plate "
        + "and (:excludeId is null or v.id <> :excludeId) "
        + "and ((v.isVerified = true and v.isActive = true) or (v.isVerified = false and v.rejectedAt is null))")
    boolean existsLivePlate(@Param("plate") String plate, @Param("excludeId") String excludeId);

    @Query("select count(v) > 0 from Vehicle v where v.driverProfile.user.id = :userId "
        + "and v.registrationImage = :path")
    boolean ownsDocument(@Param("userId") String userId, @Param("path") String path);

    default Optional<Vehicle> findCurrentVehicle(String driverProfileId, boolean driverApproved) {
        Optional<Vehicle> active = findFirstByDriverProfileIdAndIsVerifiedTrueAndIsActiveTrue(driverProfileId);
        if (driverApproved && active.isPresent()) {
            return active;
        }
        Optional<Vehicle> unverified = findFirstByDriverProfileIdAndIsVerifiedFalseOrderByCreatedAtDesc(driverProfileId);
        if (unverified.isPresent()) {
            return unverified;
        }
        return active.or(() -> findFirstByDriverProfileIdOrderByCreatedAtDesc(driverProfileId));
    }
}
