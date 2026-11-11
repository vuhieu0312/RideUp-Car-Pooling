package com.rideup.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.dto.response.NotificationResponse;
import com.rideup.entity.Booking;
import com.rideup.entity.Notification;
import com.rideup.entity.Trip;
import com.rideup.entity.User;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.NotificationType;
import com.rideup.enums.ReadStatus;
import com.rideup.exception.AppException;
import com.rideup.repository.NotificationRepository;
import com.rideup.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationService {

    static final ObjectMapper JSON = new ObjectMapper();
    static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM");

    NotificationRepository notificationRepository;
    UserRepository userRepository;

    @Transactional
    public boolean create(User user, NotificationType type, String title, String message,
                          String bookingId, String tripId, String dedupKey) {
        if (user == null) {
            return false;
        }
        if (dedupKey != null && notificationRepository.existsByUserIdAndDedupKey(user.getId(), dedupKey)) {
            return false;
        }
        notificationRepository.save(Notification.builder()
            .user(user)
            .type(type)
            .title(title)
            .message(message)
            .status(ReadStatus.UNREAD)
            .metadata(metadata(bookingId, tripId))
            .dedupKey(dedupKey)
            .build());
        return true;
    }

    @Transactional
    public boolean notifyChatMessage(String recipientId, String senderName, String preview,
                                     String bookingId, String conversationId) {
        User recipient = userRepository.findById(recipientId).orElse(null);
        if (recipient == null) {
            return false;
        }
        String key = "chat:" + conversationId;
        notificationRepository.deleteAll(
            notificationRepository.findByUserIdAndDedupKeyAndStatus(recipientId, key, ReadStatus.UNREAD));
        String text = preview == null ? "" : (preview.length() > 120 ? preview.substring(0, 120) + "…" : preview);
        notificationRepository.save(Notification.builder()
            .user(recipient)
            .type(NotificationType.CHAT_MESSAGE)
            .title("Tin nhắn mới từ " + senderName)
            .message(text)
            .status(ReadStatus.UNREAD)
            .metadata(metadata(bookingId, null))
            .dedupKey(key)
            .build());
        return true;
    }

    @Transactional
    public Set<String> onBookingChanged(Booking b) {
        Set<String> notified = new HashSet<>();
        if (b == null || b.getStatus() == null || b.getTrip() == null) {
            return notified;
        }
        Trip trip = b.getTrip();
        User customer = b.getCustomer();
        User driver = trip.getDriver();
        BookingStatus status = b.getStatus();
        String key = "booking:" + b.getId() + ":" + status.name();
        String route = routeOf(trip);
        String detail = route + " · " + timeOf(trip) + " · mã " + b.getBookingCode();
        String reason = b.getCancelReason() == null || b.getCancelReason().isBlank()
            ? "" : "\nLý do: " + b.getCancelReason();

        switch (status) {
            case WAITING_DRIVER_APPROVAL -> send(notified, driver, NotificationType.BOOKING_REQUEST,
                "Có yêu cầu đặt chỗ mới",
                customer.getFullName() + " đặt " + seats(b) + " chỗ · " + detail, b, key);
            case CONFIRMED -> send(notified, customer, NotificationType.BOOKING_CONFIRMED,
                "Tài xế đã xác nhận chuyến đi", detail, b, key);
            case REJECTED_BY_DRIVER -> send(notified, customer, NotificationType.BOOKING_REJECTED,
                "Tài xế đã từ chối đặt chỗ", detail + reason, b, key);
            case CANCELLED_BY_USER -> send(notified, driver, NotificationType.BOOKING_CANCELED,
                "Khách đã huỷ đặt chỗ", customer.getFullName() + " · " + detail, b, key);
            case CANCELLED_BY_DRIVER -> send(notified, customer, NotificationType.BOOKING_CANCELED,
                "Chuyến đi đã bị huỷ", detail + reason, b, key);
            case COMPLETED -> send(notified, customer, NotificationType.BOOKING_COMPLETED,
                "Chuyến đi đã hoàn thành", detail + "\nHãy đánh giá tài xế của bạn.", b, key);
            case EXPIRED -> send(notified, customer, NotificationType.BOOKING_EXPIRED,
                "Yêu cầu đặt chỗ đã hết hạn", detail, b, key);
            case CANCELLED_PAYMENT_FAILED -> send(notified, customer, NotificationType.PAYMENT_FAILED,
                "Thanh toán không thành công", detail, b, key);
            default -> { }
        }
        return notified;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(String userId, int page, int size) {
        return notificationRepository
            .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50)))
            .map(this::toResponse)
            .getContent();
    }

    @Transactional(readOnly = true)
    public long unreadCount(String userId) {
        return notificationRepository.countByUserIdAndStatus(userId, ReadStatus.UNREAD);
    }

    @Transactional
    public void markRead(String userId, String id) {
        Notification n = notificationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy thông báo"));
        if (n.getStatus() != ReadStatus.READ) {
            n.setStatus(ReadStatus.READ);
            n.setReadAt(LocalDateTime.now(TripService.VN_ZONE));
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void markAllRead(String userId) {
        notificationRepository.markAllAsRead(userId, ReadStatus.READ, ReadStatus.UNREAD,
            LocalDateTime.now(TripService.VN_ZONE));
    }

    public static String routeOf(Trip trip) {
        String from = trip.getStartProvince() == null ? "?" : trip.getStartProvince().getName();
        String to = trip.getEndProvince() == null ? "?" : trip.getEndProvince().getName();
        return from + " → " + to;
    }

    public static String timeOf(Trip trip) {
        return trip.getDepartureTime() == null ? "" : trip.getDepartureTime().format(TIME);
    }

    private void send(Set<String> notified, User user, NotificationType type, String title,
                      String message, Booking b, String key) {
        if (create(user, type, title, message, b.getId(), b.getTrip().getId(), key)) {
            notified.add(user.getId());
        }
    }

    private static int seats(Booking b) {
        return b.getSeatCount() == null ? 1 : b.getSeatCount();
    }

    private static String metadata(String bookingId, String tripId) {
        Map<String, String> m = new LinkedHashMap<>();
        if (bookingId != null) {
            m.put("bookingId", bookingId);
        }
        if (tripId != null) {
            m.put("tripId", tripId);
        }
        if (m.isEmpty()) {
            return null;
        }
        try {
            return JSON.writeValueAsString(m);
        } catch (Exception e) {
            return null;
        }
    }

    private NotificationResponse toResponse(Notification n) {
        String bookingId = null;
        String tripId = null;
        if (n.getMetadata() != null) {
            try {
                JsonNode node = JSON.readTree(n.getMetadata());
                bookingId = node.hasNonNull("bookingId") ? node.get("bookingId").asText() : null;
                tripId = node.hasNonNull("tripId") ? node.get("tripId").asText() : null;
            } catch (Exception e) {
                log.warn("Metadata thông báo {} không hợp lệ", n.getId());
            }
        }
        return NotificationResponse.builder()
            .id(n.getId())
            .type(n.getType())
            .title(n.getTitle())
            .message(n.getMessage())
            .read(n.getStatus() == ReadStatus.READ)
            .createdAt(n.getCreatedAt())
            .bookingId(bookingId)
            .tripId(tripId)
            .build();
    }
}
