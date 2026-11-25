package com.rideup.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;

public interface AdminUserProjection {
    String getId();

    String getFullName();

    String getEmail();

    String getPhone();

    LocalDate getDateOfBirth();

    String getGender();

    String getAvatarUrl();

    String getRole();

    String getAccountStatus();

    Integer getViolationCount();

    LocalDateTime getCreatedAt();

    LocalDateTime getUpdatedAt();
}
