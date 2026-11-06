package com.rideup.security;

import com.rideup.service.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final String CHAT_TOPIC_PREFIX = "/topic/chat/";

    private final ConversationService conversationService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        // phải dùng accessor có sẵn trong message, wrap() tạo bản sao nên setUser không tới được session
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
            if (sessionAttrs == null) {
                throw new MessageDeliveryException("WebSocket: no session attributes");
            }

            String userId = (String) sessionAttrs.get("userId");
            if (userId == null) {
                throw new MessageDeliveryException("WebSocket: missing userId in session");
            }

            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) sessionAttrs.getOrDefault("roles", List.of());

            List<SimpleGrantedAuthority> authorities = roles.stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                .toList();

            Authentication auth = new UsernamePasswordAuthenticationToken(
                userId, null, authorities
            );
            accessor.setUser(auth);
            log.info("WebSocket CONNECT userId={} roles={}", userId, roles);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/")) {
                checkChatSubscription(accessor, destination);
            }
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination == null || !destination.startsWith("/app/")) {
                throw new MessageDeliveryException("WebSocket: chỉ được gửi tới /app/**");
            }
        }

        return message;
    }

    private void checkChatSubscription(StompHeaderAccessor accessor, String destination) {
        if (!destination.startsWith(CHAT_TOPIC_PREFIX) || accessor.getUser() == null) {
            throw new MessageDeliveryException("WebSocket: không được đăng ký " + destination);
        }
        String conversationId = destination.substring(CHAT_TOPIC_PREFIX.length());
        try {
            conversationService.getForParticipant(conversationId, accessor.getUser().getName());
        } catch (Exception e) {
            throw new MessageDeliveryException("WebSocket: không có quyền vào phòng chat " + conversationId);
        }
    }
}