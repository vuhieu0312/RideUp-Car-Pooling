package com.rideup.service;

import com.rideup.entity.Conversation;
import com.rideup.entity.Message;
import com.rideup.enums.BookingStatus;
import com.rideup.exception.AppException;
import com.rideup.exception.ErrorCode;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.ConversationRepository;
import com.rideup.repository.MessageRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MessageService {

        private final MessageRepository messageRepository;

        private final ConversationRepository conversationRepository;

        private final BookingRepository bookingRepository;

        public Message saveMessage(Message message, String senderId) {

                if (message.getConversationId() == null) {
                        throw new RuntimeException(
                                        "conversationId không được null");
                }

                Conversation conversation = conversationRepository.findById(message.getConversationId())
                                .orElseThrow(() -> new AppException(ErrorCode.CHAT_THREAD_NOT_FOUND));
                boolean isParticipant = conversation.getParticipants() != null
                                && java.util.Arrays.asList(conversation.getParticipants().split(","))
                                                .contains(senderId);
                if (!isParticipant) {
                        throw new AppException(ErrorCode.CHAT_FORBIDDEN);
                }
                BookingStatus status = bookingRepository.findById(conversation.getBookingId())
                                .map(booking -> booking.getStatus())
                                .orElse(null);
                if (status != BookingStatus.CONFIRMED) {
                        throw new AppException(ErrorCode.CHAT_NOT_ALLOWED);
                }

                message.setSenderId(senderId);

                if (message.getCreatedAt() == null) {
                        message.setCreatedAt(
                                        LocalDateTime.now());
                }

                Message saved = messageRepository.save(message);

                updateConversationLastMessage(saved);

                return saved;
        }

        private void updateConversationLastMessage(
                        Message message) {

                conversationRepository
                                .findById(message.getConversationId())
                                .ifPresent(conversation -> {

                                        conversation.setLastMessagePreview(
                                                        message.getContent());

                                        conversation.setLastMessageSenderId(
                                                        message.getSenderId());

                                        conversation.setLastMessageAt(
                                                        message.getCreatedAt());

                                        conversationRepository.save(conversation);

                                });

        }

        public Page<Message> getMessages(
                        String conversationId,
                        int page,
                        int size) {

                return messageRepository
                                .findByConversationIdOrderByCreatedAtAsc(
                                                conversationId,
                                                PageRequest.of(page, size));
        }

        public Message getMessage(String id) {

                return messageRepository
                                .findById(id)
                                .orElseThrow(
                                                () -> new RuntimeException(
                                                                "Message not found"));
        }

        public void deleteMessage(
                        String id,
                        String userId) {

                Message message = getMessage(id);

                message.setDeletedAt(
                                LocalDateTime.now());

                message.setDeletedBy(
                                userId);

                messageRepository.save(message);

        }

}