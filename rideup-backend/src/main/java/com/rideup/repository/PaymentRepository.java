package com.rideup.repository;

import com.rideup.entity.Payment;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentMethod;
import com.rideup.enums.PaymentStatus;
import com.rideup.enums.PayoutStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByBookingId(String bookingId);

    @Query("select sum(p.amount) from Payment p where p.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") PaymentStatus status);

    @Query("select p.paidAt, p.amount from Payment p where p.status = :status and p.paidAt >= :from")
    List<Object[]> findPaidSince(@Param("status") PaymentStatus status, @Param("from") LocalDateTime from);

    @Query("select d.id, d.fullName, sum(p.amount) "
        + "from Payment p join p.booking b join b.trip t join t.driverProfile dp join dp.user d "
        + "where p.status = :status group by d.id, d.fullName order by sum(p.amount) desc")
    List<Object[]> findRevenueByDriver(@Param("status") PaymentStatus status, Pageable pageable);

    Optional<Payment> findByTransactionId(String transactionId);

    @Query("select sum(p.commissionAmount) from Payment p where p.status = :status")
    BigDecimal sumCommissionByStatus(@Param("status") PaymentStatus status);

    // payment đã PAID nhưng chưa chuyển phần cho tài xế
    @Query("select p from Payment p join fetch p.booking b join fetch b.trip t "
        + "where t.driverProfile.user.id = :driverUserId and p.method = :method and p.status = :status "
        + "and (p.payoutStatus is null or p.payoutStatus not in :done)")
    List<Payment> findUntransferred(@Param("driverUserId") String driverUserId,
                                    @Param("method") PaymentMethod method,
                                    @Param("status") PaymentStatus status,
                                    @Param("done") java.util.Collection<PayoutStatus> done);

    @Query("select p from Payment p join fetch p.booking b join fetch b.trip t "
        + "where t.driverProfile.user.id = :driverUserId "
        + "and p.payoutStatus in :done "
        + "order by p.paidAt desc")
    List<Payment> findTransferred(@Param("driverUserId") String driverUserId,
                                  @Param("done") java.util.Collection<PayoutStatus> done,
                                  Pageable pageable);

    // booking đã hoàn thành từ mốc thời gian, dùng cho thống kê
    @Query("select p from Payment p join fetch p.booking b join fetch b.trip t "
        + "where t.driverProfile.user.id = :driverUserId and b.status = :bookingStatus "
        + "and p.status not in :excluded and t.departureTime >= :from")
    List<Payment> findCompletedForStats(@Param("driverUserId") String driverUserId,
                                        @Param("bookingStatus") BookingStatus bookingStatus,
                                        @Param("excluded") java.util.Collection<PaymentStatus> excluded,
                                        @Param("from") LocalDateTime from);
}
