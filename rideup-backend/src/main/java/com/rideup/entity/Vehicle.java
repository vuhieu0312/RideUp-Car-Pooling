package com.rideup.entity;

import com.rideup.enums.VehicleType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicle")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    String id;

    // 1 tài xế có thể có nhiều xe, chỉ 1 xe isActive tại một thời điểm
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    DriverProfile driverProfile;

    @Column(nullable = false, length = 20)
    String plateNumber;

    @Column(length = 100)
    String vehicleBrand;

    @Column(length = 100)
    String vehicleModel;

    Integer vehicleYear;

    @Column(length = 50)
    String vehicleColor;

    @Column(nullable = false)
    Integer seatCapacity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    VehicleType vehicleType;

    @Column(length = 500)
    String vehicleImage;

    @Column(length = 500)
    String registrationImage;

    LocalDate registrationExpiryDate;

    @Column(nullable = false)
    Boolean isVerified;

    @Column(nullable = false)
    Boolean isActive;

    LocalDateTime approvedAt;

    @Column(length = 36)
    String approvedBy;

    LocalDateTime rejectedAt;

    @Column(length = 500)
    String rejectionReason;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    LocalDateTime updatedAt;
}
