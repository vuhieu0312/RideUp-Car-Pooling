package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.enums.DriverStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Tóm tắt trạng thái tài xế, trả về kèm AuthResponse.UserInfo
 * để frontend biết đang PENDING / APPROVED / REJECTED và route đúng.
 */
@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DriverSummary {
    String id;
    DriverStatus status;
    BigDecimal rating;
    Integer totalRides;
    LocalDateTime approvedAt;
    String rejectionReason;
}