package com.rideup.entity;

import com.rideup.enums.Gender;
import com.rideup.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    String id;

    @Column(nullable = false, length = 150)
    String fullName;

    Boolean verified;

    @Column(nullable = false, length = 20)
    String phone;

    LocalDate dateOfBirth;

    @Column(nullable = false)
    String password;

    @Enumerated(EnumType.STRING)
    Gender gender;

    @Column(length = 500)
    String avatarUrl;

    @Column(nullable = false, unique = true, length = 150)
    String email;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id")
    )
    @Column(name = "role", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    Set<Role> roles = new HashSet<>();

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    DriverProfile driverProfile;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    /** Lần cuối user login thành công. Set bởi AuthenticationService.authenticate(). */
    @Column(name = "last_login_at")
    LocalDateTime lastLoginAt;
}
