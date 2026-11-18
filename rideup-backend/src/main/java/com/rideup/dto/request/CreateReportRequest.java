package com.rideup.dto.request;

import com.rideup.enums.ReportCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateReportRequest {

    @NotBlank
    String bookingId;

    @NotBlank
    String reportedUserId;

    @NotNull
    ReportCategory category;

    @NotBlank
    @Size(max = 255)
    String title;

    @NotBlank
    String description;
}
