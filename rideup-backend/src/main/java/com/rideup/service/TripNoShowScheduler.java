package com.rideup.service;

import com.rideup.entity.Trip;
import com.rideup.enums.TripStatus;
import com.rideup.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TripNoShowScheduler {

    private final TripRepository tripRepository;
    private final TripService tripService;

    @Value("${app.trip.no-show-cancel-minutes:15}")
    private int graceMinutes;

    @Scheduled(fixedDelayString = "${app.trip.no-show-check-ms:60000}")
    public void cancelNoShowTrips() {
        LocalDateTime deadline = LocalDateTime.now(TripService.VN_ZONE).minusMinutes(graceMinutes);
        List<Trip> late = tripRepository.findByStatusInAndDepartureTimeBefore(
                List.of(TripStatus.OPEN, TripStatus.FULL), deadline);
        if (late.isEmpty()) return;

        log.info("Scheduler: {} chuyến quá giờ khởi hành > {} phút mà chưa bắt đầu", late.size(), graceMinutes);
        for (Trip trip : late) {
            try {
                if (tripService.autoCancelIfNoShow(trip.getId(), graceMinutes)) {
                    log.info("Đã tự huỷ chuyến {} (tài xế không bắt đầu)", trip.getId());
                }
            } catch (Exception ex) {
                log.error("Tự huỷ chuyến {} thất bại: {}", trip.getId(), ex.getMessage(), ex);
            }
        }
    }
}
