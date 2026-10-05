package com.rideup.entity;

import com.rideup.enums.TripStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "trip")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    User driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "start_province_id", nullable = false)
    Province startProvince;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "end_province_id", nullable = false)
    Province endProvince;

    @Column(length = 500)
    String startAddressText;

    @Column(length = 500)
    String endAddressText;

    /** Tọa độ GPS điểm đón (lấy từ ward đầu tiên của pickupWardIds, hoặc driver nhập). */
    Double pickupLat;
    Double pickupLng;

    String startWardId;
    String endWardId;

    @Column(nullable = false)
    LocalDateTime departureTime;

    LocalDateTime estimatedArrivalTime;

    @Column(nullable = false)
    Integer seatTotal;

    @Column(nullable = false)
    Integer seatAvailable;

    @Column(nullable = false, precision = 15, scale = 2)
    BigDecimal priceVnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    TripStatus status;

    @Version
    Integer version;

    @Column(length = 1000)
    String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    List<TripStop> stops = new ArrayList<>();

    /** Helper: thêm 1 pickup/dropoff stop và set back-reference. */
    public void addStop(TripStop stop) {
        if (stops == null) stops = new ArrayList<>();
        stops.add(stop);
        stop.setTrip(this);
    }
}