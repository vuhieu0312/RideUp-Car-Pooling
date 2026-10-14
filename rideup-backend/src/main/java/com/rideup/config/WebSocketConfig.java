package com.rideup.config;

import com.rideup.security.JwtHandshakeInterceptor;
import com.rideup.security.WebSocketAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/** STOMP over WebSocket. */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final WebSocketAuthChannelInterceptor authChannelInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins(
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "http://localhost:8080"
                );
        // Không bật SockJS — client thường dùng stomp.js thuần.
        // Nếu cần fallback cho browser cũ: .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Simple broker cho các destination prefix
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix cho message gửi từ client → server (nếu có @MessageMapping)
        registry.setApplicationDestinationPrefixes("/app");
        // Prefix cho user-private queue: client subscribe "/user/queue/...",
        // server convertAndSendToUser(userId, "/queue/...", payload)
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Set Authentication principal cho mỗi STOMP message dựa trên session attributes
        registration.interceptors(authChannelInterceptor);
    }
}