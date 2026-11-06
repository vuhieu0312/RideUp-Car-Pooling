package com.rideup.dto.response;

import java.time.LocalDateTime;

public record ChatConversationResponse(
        String conversationId,
        String bookingId,
        String driverName,
        LocalDateTime tripDeparture,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        String customerName) {
}