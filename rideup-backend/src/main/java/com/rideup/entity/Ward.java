package com.rideup.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Entity
@Table(name = "ward", indexes = {
    @Index(name = "idx_ward_province", columnList = "province_id"),
    @Index(name = "idx_ward_code", columnList = "code")
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

    // có thể null, không phải nguồn nào cũng có
    @Column(length = 20)
    String code;

    @Column(precision = 10, scale = 7)
    BigDecimal lat;

    @Column(precision = 10, scale = 7)
    BigDecimal lng;

    // id relation của OSM
    @Column(name = "osmid")
    Long osmId;

    @Column(length = 500)
    String displayName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "province_id", nullable = false)
    Province province;
}
