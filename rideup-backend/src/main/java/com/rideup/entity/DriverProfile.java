package com.rideup.entity;

import com.rideup.enums.DriverStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "driver_profile")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    User user;

    @Column(nullable = false, length = 20)
    String cccd;

    @Column(length = 500)
    String cccdImageFront;

    @Column(length = 500)
    String cccdImageBack;

    @Column(nullable = false, length = 20)
    String gplx;

    LocalDate gplxExpiryDate;

    @Column(length = 500)
    String gplxImage;

    @Column(nullable = false, precision = 3, scale = 2)
    BigDecimal driverRating;

    @Column(nullable = false)
    Integer totalDriverRides;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    DriverStatus status;

    LocalDateTime approvedAt;

    @Column(length = 36)
    String approvedBy;

    LocalDateTime rejectedAt;

    @Column(length = 500)
    String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
