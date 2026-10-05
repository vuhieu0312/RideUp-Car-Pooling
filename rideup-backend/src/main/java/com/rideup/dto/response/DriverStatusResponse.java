package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.rideup.enums.DriverStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

/**
 * Trả về cho driver app khi gọi GET /driver/status.
 * Endpoint nhẹ để app poll định kỳ (mỗi 5-10s) hoặc khi user mở app.
 * Frontend dựa vào status để navigate: PENDING→/pending, APPROVED→/home, REJECTED→/rejected.
 */
@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DriverStatusResponse {
    DriverStatus status;
    /** Message tiếng Việt đã được format sẵn, frontend chỉ cần hiển thị. */
    String message;
    /** Lý do bị từ chối (chỉ có khi status=REJECTED). */
    String rejectionReason;
}