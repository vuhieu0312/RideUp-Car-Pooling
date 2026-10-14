package com.rideup.entity;

import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking")
// Đã BỎ unique constraint (customer_id, trip_id, status) từng có ở đây.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    String id;

    @Column(unique = true, nullable = false)
    String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    Trip trip;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    BookingStatus status;

    @OneToOne(mappedBy = "booking", fetch = FetchType.LAZY)
    Payment payment;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    PaymentStatus paymentStatus;

    Integer seatCount;
    BigDecimal pricePerSeat;
    BigDecimal totalAmount;

    LocalDateTime reservedAt;
    LocalDateTime expiresAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_ward_id")
    Ward pickupWard;

    Double pickupLat;
    Double pickupLng;
    String pickupAddressText;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dropoff_ward_id")
    Ward dropoffWard;

    Double dropoffLat;
    Double dropoffLng;
    String dropoffAddressText;

    String note;

    LocalDateTime cancelledAt;
    String cancelReason;

    Integer tripVersionAtReserve;

    @Version
    Integer version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
