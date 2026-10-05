package com.rideup.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Entity
@Table(name = "ward")
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

    @Column(nullable = false, length = 36)
    String provinceId;

    @Column(nullable = false, length = 150)
    String name;

    @Column(nullable = false, unique = true, length = 20)
    String code;

    @Column(precision = 10, scale = 7)
    BigDecimal lat;

    @Column(precision = 10, scale = 7)
    BigDecimal lng;

    Long osmid;

    @Column(length = 250)
    String displayName;
}
