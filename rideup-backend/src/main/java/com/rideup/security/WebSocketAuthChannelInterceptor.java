package com.rideup.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Set Authentication principal cho STOMP CONNECT dựa trên session attributes
 * mà JwtHandshakeInterceptor đã đặt. Sau đó @SendToUser hoạt động đúng user.
 *
 * Lưu ý: KHÔNG validate lại JWT ở đây — JwtHandshakeInterceptor đã làm rồi.
 */
@Component
@Slf4j
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

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
        }

        return message;
    }
}