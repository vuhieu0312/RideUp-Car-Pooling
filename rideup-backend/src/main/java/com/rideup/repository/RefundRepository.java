package com.rideup.repository;

import com.rideup.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, String> {

    List<Refund> findByPaymentId(String paymentId);

    Optional<Refund> findByRequestId(String requestId);
}
