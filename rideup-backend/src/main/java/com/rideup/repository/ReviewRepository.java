package com.rideup.repository;

import com.rideup.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, String> {

    List<Review> findByTripId(String tripId);

    List<Review> findByDriverIdOrderByCreatedAtDesc(String driverId);

    List<Review> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    Optional<Review> findByTripIdAndCustomerId(String tripId, String customerId);

    boolean existsByTripIdAndCustomerId(String tripId, String customerId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.driver.id = :driverId")
    Double avgRatingByDriverId(@Param("driverId") String driverId);

    long countByDriverId(String driverId);
}
