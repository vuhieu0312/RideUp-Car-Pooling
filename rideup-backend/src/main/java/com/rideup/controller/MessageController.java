package com.rideup.controller;

import org.springframework.security.core.Authentication;
import com.rideup.entity.Message;
import com.rideup.service.ConversationService;
import com.rideup.service.MessageService;

import lombok.RequiredArgsConstructor;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/messages")
public class MessageController {

        private final MessageService messageService;

        private final ConversationService conversationService;

        private final SimpMessagingTemplate messagingTemplate;

        /*
         * REST:
         * Lấy lịch sử chat
         */
        @GetMapping("/{conversationId}")
        public ResponseEntity<Page<Message>> history(
                        @PathVariable String conversationId,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "30") int size,
                        Authentication authentication) {

                conversationService.getForParticipant(conversationId, authentication.getName());

                return ResponseEntity.ok(
                                messageService.getMessages(
                                                conversationId,
                                                page,
                                                size));
        }

        /*
         * WebSocket:
         * 
         * Client gửi:
         * 
         * /app/chat.send
         * 
         */
        @MessageMapping("/chat.send")
        public void send(
                        Message message,
                        Authentication authentication) {

                Message saved = messageService.saveMessage(message, authentication.getName());

                messagingTemplate.convertAndSend(
                                "/topic/chat/"
                                                + saved.getConversationId(),
                                saved);

        }

}