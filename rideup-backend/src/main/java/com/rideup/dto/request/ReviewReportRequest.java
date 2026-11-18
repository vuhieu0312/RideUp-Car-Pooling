package com.rideup.dto.request;

import com.rideup.enums.ReportStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReviewReportRequest {

    @NotNull
    ReportStatus status;
}
