package com.rideup.service;

import com.rideup.entity.Conversation;
import com.rideup.dto.response.ChatConversationResponse;
import com.rideup.enums.BookingStatus;
import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.ConversationRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConversationService {

        private final ConversationRepository repository;

        private final BookingRepository bookingRepository;

        public List<ChatConversationResponse> listCustomerConversations(String customerId) {
                return bookingRepository
                                .findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, BookingStatus.CONFIRMED)
                                .stream()
                                .map(booking -> {
                                        Conversation conversation = createIfNotExist(
                                                        booking.getId(), customerId,
                                                        booking.getTrip().getDriver().getId());
                                        return new ChatConversationResponse(
                                                        conversation.getId(),
                                                        booking.getId(),
                                                        booking.getTrip().getDriver().getFullName(),
                                                        booking.getTrip().getDepartureTime(),
                                                        conversation.getLastMessagePreview(),
                                                        conversation.getLastMessageAt(),
                                                        booking.getCustomer().getFullName());
                                })
                                .toList();
        }

        public List<ChatConversationResponse> listDriverConversations(String driverId) {
                return bookingRepository
                                .findByDriverIdAndStatusIn(driverId, List.of(BookingStatus.CONFIRMED))
                                .stream()
                                .map(booking -> {
                                        String customerId = booking.getCustomer().getId();
                                        Conversation conversation = createIfNotExist(
                                                        booking.getId(), customerId, driverId);
                                        return new ChatConversationResponse(
                                                        conversation.getId(),
                                                        booking.getId(),
                                                        booking.getTrip().getDriver().getFullName(),
                                                        booking.getTrip().getDepartureTime(),
                                                        conversation.getLastMessagePreview(),
                                                        conversation.getLastMessageAt(),
                                                        booking.getCustomer().getFullName());
                                })
                                .toList();
        }

        public Conversation getForParticipant(String conversationId, String userId) {
                Conversation conversation = repository.findById(conversationId)
                                .orElseThrow(() -> new AppException(ErrorCode.CHAT_THREAD_NOT_FOUND));
                boolean isParticipant = conversation.getParticipants() != null
                                && Arrays.asList(conversation.getParticipants().split(",")).contains(userId);
                if (!isParticipant) {
                        throw new AppException(ErrorCode.CHAT_FORBIDDEN);
                }
                return conversation;
        }

        public Conversation createIfNotExist(
                        String bookingId,
                        String customerId,
                        String driverId) {

                return repository
                                .findByBookingId(bookingId)
                                .orElseGet(() -> {

                                        Conversation c = Conversation.builder()
                                                        .id(UUID.randomUUID().toString())
                                                        .bookingId(bookingId)
                                                        .participants(
                                                                        customerId + "," + driverId)
                                                        .createdAt(
                                                                        LocalDateTime.now())
                                                        .updatedAt(
                                                                        LocalDateTime.now())
                                                        .build();

                                        return repository.save(c);

                                });

        }

}