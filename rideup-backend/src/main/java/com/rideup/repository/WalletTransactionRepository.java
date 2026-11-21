package com.rideup.repository;

import com.rideup.entity.WalletTransaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, String> {

    boolean existsByStripeReference(String stripeReference);

    boolean existsByBookingId(String bookingId);

    @Query("select w from WalletTransaction w where w.driverProfile.id = :profileId order by w.createdAt desc")
    List<WalletTransaction> findRecent(@Param("profileId") String profileId, Pageable pageable);
}
