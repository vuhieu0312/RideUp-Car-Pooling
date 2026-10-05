package com.rideup.repository;

import com.rideup.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {

    Optional<Vehicle> findByDriverId(String driverId);

    List<Vehicle> findByDriverIdAndIsActiveTrue(String driverId);

    Optional<Vehicle> findByPlateNumber(String plateNumber);

    boolean existsByPlateNumber(String plateNumber);

    List<Vehicle> findByIsVerified(Boolean isVerified);

    List<Vehicle> findByIsVerifiedAndIsActive(Boolean isVerified, Boolean isActive);
}
