package com.rideup.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "province")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Province {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    String id;

    /** Tên tỉnh / thành phố */
    @Column(nullable = false, length = 150)
    String name;

    /** Mã tỉnh (01, 02, ...) */
    @Column(nullable = false, unique = true, length = 20)
    String code;

    /** Vĩ độ trung tâm tỉnh (từ OSM) */
    @Column(precision = 10, scale = 7)
    BigDecimal lat;

    /** Kinh độ trung tâm tỉnh (từ OSM) */
    @Column(precision = 10, scale = 7)
    BigDecimal lng;

    /** OSM relation id (dùng để cào ward con) */
    @Column(name = "osmid")
    Long osmId;

    /** Danh sách xã / phường / thị trấn thuộc tỉnh */
    @OneToMany(mappedBy = "province", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    List<Ward> wards = new ArrayList<>();
}
