package com.rideup.entity;

import com.rideup.enums.NotificationType;
import com.rideup.enums.ReadStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(nullable = false, length = 255)
    String title;

    @Column(nullable = false, length = 1000)
    String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    ReadStatus status;

    @Column(length = 2000)
    String metadata;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    LocalDateTime readAt;
}
