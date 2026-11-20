package com.rideup.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Builder
public class AdminDashboardStats {
    private long totalUsers;
    private long totalTrips;
    private BigDecimal totalRevenue;
    private BigDecimal platformFee;
    private TripStats trips;
    private RevenueStats revenue;
    private DriverStats drivers;
    private CustomerStats customers;
    private ReportStats reports;

    @Getter
    @Builder
    public static class TripStats {
        private long total;
        private long completed;
        private long canceled;
        private List<Map<String, Object>> timeline;
    }

    @Getter
    @Builder
    public static class RevenueStats {
        private BigDecimal total;
        private BigDecimal platformFee;
        private List<Map<String, Object>> timeline;
        private List<Map<String, Object>> byDriver;
    }

    @Getter
    @Builder
    public static class DriverStats {
        private long total;
        private long newDrivers;
        private long activeDrivers;
        private double averageRating;
        private List<Map<String, Object>> topActive;
    }

    @Getter
    @Builder
    public static class CustomerStats {
        private long total;
        private long newCustomers;
        private long activeCustomers;
        private List<Map<String, Object>> topCustomers;
    }

    @Getter
    @Builder
    public static class ReportStats {
        private long total;
        private Map<String, Long> byStatus;
        private Map<String, Long> byTarget;
    }
}
