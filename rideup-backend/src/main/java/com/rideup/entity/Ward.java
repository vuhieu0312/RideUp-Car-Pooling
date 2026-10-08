package com.rideup.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * Phường / xã / thị trấn thuộc 1 Province.
 *
 * Dùng {@link ManyToOne} tới Province thay vì lưu provinceId string — JPA quản lý
 * quan hệ tự động, cascade xóa theo province.
 *
 * Trước đây entity này có `code` NOT NULL UNIQUE — vô tình làm seeder Overpass
 * crash (không set code → mọi INSERT bị reject). Sửa: code nullable, dùng index
 * thường (không UNIQUE) để tra cứu nhanh mà không chặn insert từ nguồn khác.
 */
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

    /** Tên xã / phường / thị trấn */
    @Column(nullable = false, length = 150)
    String name;

    /** Mã đơn vị hành chính (nullable — không phải nguồn nào cũng có code) */
    @Column(length = 20)
    String code;

    /** Vĩ độ trung tâm (từ OSM) */
    @Column(precision = 10, scale = 7)
    BigDecimal lat;

    /** Kinh độ trung tâm (từ OSM) */
    @Column(precision = 10, scale = 7)
    BigDecimal lng;

    /** OSM relation id (dùng để tra cứu/cào dữ liệu, idempotent seed) */
    @Column(name = "osmid")
    Long osmId;

    /** Tên đầy đủ (display_name từ Nominatim) */
    @Column(length = 500)
    String displayName;

    /** Tỉnh / TP chứa ward này */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "province_id", nullable = false)
    Province province;
}
