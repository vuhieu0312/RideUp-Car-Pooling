package com.rideup.repository;

import com.rideup.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByBookingId(String bookingId);

    Optional<Payment> findByTransactionId(String transactionId);

    Optional<Payment> findByCorrelationId(String correlationId);
}
