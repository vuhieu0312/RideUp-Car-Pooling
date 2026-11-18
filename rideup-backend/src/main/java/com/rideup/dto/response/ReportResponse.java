package com.rideup.dto.response;

import com.rideup.enums.AccountStatus;
import com.rideup.enums.ReportCategory;
import com.rideup.enums.ReportStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportResponse {
    String id;
    String reporterId;
    String reporterName;
    String reportedUserId;
    String reportedUserName;
    Integer violationCount;
    AccountStatus accountStatus;
    String bookingId;
    String bookingCode;
    String tripId;
    ReportCategory category;
    String title;
    String description;
    String evidenceUrl;
    ReportStatus status;
    String handledById;
    String handledByName;
    LocalDateTime handledAt;
    LocalDateTime createdAt;
}
