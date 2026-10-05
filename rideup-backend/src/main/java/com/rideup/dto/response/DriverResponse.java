package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.enums.DriverStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Trả về cho driver app khi gọi GET /driver/me.
 * Driver có thể xem profile của mình ở mọi trạng thái (PENDING/APPROVED/REJECTED).
 */
@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DriverResponse {
    String id;
    String userId;
    String fullName;
    String email;
    String phone;

    String cccd;
    String cccdImageFront;
    String cccdImageBack;
    String gplx;
    LocalDate gplxExpiryDate;
    String gplxImage;

    BigDecimal driverRating;
    Integer totalDriverRides;

    DriverStatus status;
    LocalDateTime approvedAt;
    String approvedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}