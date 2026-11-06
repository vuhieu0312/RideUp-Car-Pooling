package com.rideup.repository;

import com.rideup.entity.Payment;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByBookingId(String bookingId);

    Optional<Payment> findByTransactionId(String transactionId);

    // payment đã PAID nhưng chưa chuyển phần cho tài xế
    @Query("select p from Payment p join fetch p.booking b join fetch b.trip t "
        + "where t.driver.id = :driverUserId and p.method = :method and p.status = :status "
        + "and p.transferId is null")
    List<Payment> findUntransferred(@Param("driverUserId") String driverUserId,
                                    @Param("method") PaymentMethod method,
                                    @Param("status") PaymentStatus status);

    @Query("select p from Payment p join fetch p.booking b join fetch b.trip t "
        + "where t.driver.id = :driverUserId and p.transferId is not null order by p.paidAt desc")
    List<Payment> findTransferred(@Param("driverUserId") String driverUserId, Pageable pageable);

    // booking đã hoàn thành từ mốc thời gian, dùng cho thống kê
    @Query("select p from Payment p join fetch p.booking b join fetch b.trip t "
        + "where t.driver.id = :driverUserId and b.status = :bookingStatus "
        + "and p.status not in :excluded and t.departureTime >= :from")
    List<Payment> findCompletedForStats(@Param("driverUserId") String driverUserId,
                                        @Param("bookingStatus") BookingStatus bookingStatus,
                                        @Param("excluded") java.util.Collection<PaymentStatus> excluded,
                                        @Param("from") LocalDateTime from);
}
