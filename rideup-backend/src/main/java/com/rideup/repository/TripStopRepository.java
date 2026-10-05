package com.rideup.repository;

import com.rideup.entity.TripStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripStopRepository extends JpaRepository<TripStop, String> {

    List<TripStop> findByTripId(String tripId);

    void deleteByTripId(String tripId);
}
