package com.rideup.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Entity
@Table(name = "ward", indexes = {
    @Index(name = "idx_ward_province", columnList = "province_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Ward {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    String id;

    @Column(nullable = false, length = 150)
    String name;

    @Column(precision = 10, scale = 7)
    BigDecimal lat;

    @Column(precision = 10, scale = 7)
    BigDecimal lng;

    // id relation của OSM
    @Column(name = "osmid")
    Long osmId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "province_id", nullable = false)
    Province province;
}
