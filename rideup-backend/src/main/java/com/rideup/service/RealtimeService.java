package com.rideup.service;

import com.rideup.entity.Booking;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Trip;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.LinkedHashMap;
import java.util.Map;

// chỉ gửi id nhỏ, app tự tải lại dữ liệu; gửi sau commit, lỗi gửi không ảnh hưởng nghiệp vụ
@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimeService {

    public static final String DESTINATION = "/queue/events";

    private final SimpMessagingTemplate messagingTemplate;

    public void bookingChanged(Booking b) {
        if (b == null || b.getCustomer() == null || b.getTrip() == null) {
            return;
        }
        Map<String, Object> event = event("BOOKING_UPDATED");
        event.put("bookingId", b.getId());
        event.put("tripId", b.getTrip().getId());
        event.put("status", b.getStatus() == null ? null : b.getStatus().name());

        queue(b.getCustomer().getId(), event);
        if (b.getTrip().getDriver() != null) {
            queue(b.getTrip().getDriver().getId(), event);
        }
    }

    public void tripChanged(Trip t) {
        if (t == null || t.getDriver() == null) {
            return;
        }
        Map<String, Object> event = event("TRIP_UPDATED");
        event.put("tripId", t.getId());
        event.put("status", t.getStatus() == null ? null : t.getStatus().name());
        queue(t.getDriver().getId(), event);
    }

    public void driverProfileChanged(DriverProfile p) {
        if (p == null || p.getUser() == null) {
            return;
        }
        Map<String, Object> event = event("DRIVER_PROFILE_UPDATED");
        event.put("status", p.getStatus() == null ? null : p.getStatus().name());
        queue(p.getUser().getId(), event);
    }

    public void vehicleChanged(String driverUserId) {
        queue(driverUserId, event("VEHICLE_UPDATED"));
    }

    private Map<String, Object> event(String type) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        return m;
    }

    private void queue(String userId, Map<String, Object> event) {
        if (userId == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send(userId, event);
                }
            });
        } else {
            send(userId, event);
        }
    }

    private void send(String userId, Map<String, Object> event) {
        try {
            messagingTemplate.convertAndSendToUser(userId, DESTINATION, event);
            log.info("[RT] gửi {} → user={} {}", event.get("type"), userId, event);
        } catch (Exception e) {
            log.warn("Gửi sự kiện realtime thất bại user={} type={}: {}", userId, event.get("type"), e.getMessage());
        }
    }
}
