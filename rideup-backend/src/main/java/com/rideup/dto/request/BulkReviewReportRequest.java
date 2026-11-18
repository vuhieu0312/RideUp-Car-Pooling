package com.rideup.dto.request;

import com.rideup.enums.ReportStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BulkReviewReportRequest {
    @NotEmpty
    private List<String> ids;

    @NotNull
    private ReportStatus status;
}
