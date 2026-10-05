package com.rideup.entity;

import com.rideup.enums.BookingStatus;
import com.rideup.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking",
    // Ràng buộc DB: mỗi customer chỉ có tối đa 1 booking ACTIVE (PENDING/CONFIRMED)
    // cho cùng 1 trip. Hibernate sẽ tự sinh unique constraint khi ddl-auto=update
    // và bắn DataIntegrityViolationException nếu vi phạm — đây là lớp bảo vệ
    // tuyệt đối cuối cùng nếu logic check ở service bị bypass.
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_booking_active_per_customer_trip",
            columnNames = {"customer_id", "trip_id", "status"})
    })
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
    @Column(nullable = false)
    BookingStatus status;

    @OneToOne(mappedBy = "booking", fetch = FetchType.LAZY)
    Payment payment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
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
