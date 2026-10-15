package com.rideup.config;

import com.rideup.security.JwtHandshakeInterceptor;
import com.rideup.security.WebSocketAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;
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

    /**
     * Origin được phép mở WebSocket. App React Native (Expo Go / dev build) tự gửi header
     * Origin = "http://<IP LAN máy dev>:8080" chứ không phải localhost → nếu chỉ cho localhost
     * thì handshake bị 403, app rơi về polling 30s. Mặc định cho localhost + các dải IP LAN nội bộ.
     * Xác thực vẫn bằng JWT ở JwtHandshakeInterceptor (không dùng cookie) nên mở origin không lộ phiên.
     */
    @Value("${app.ws.allowed-origin-patterns:http://localhost:*,http://127.0.0.1:*,http://192.168.*:*,http://10.*:*,http://172.*:*}")
    private String[] allowedOriginPatterns;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .addInterceptors(jwtHandshakeInterceptor)
                // Gắn user (id lấy từ JWT lúc handshake) vào phiên WebSocket để
                // convertAndSendToUser(userId, "/queue/events", ...) tìm được đúng người nhận.
                .setHandshakeHandler(new DefaultHandshakeHandler() {
                    @Override
                    protected Principal determineUser(ServerHttpRequest request,
                                                      WebSocketHandler wsHandler,
                                                      Map<String, Object> attributes) {
                        Object userId = attributes.get("userId");
                        return userId == null ? null : () -> userId.toString();
                    }
                })
                .setAllowedOriginPatterns(allowedOriginPatterns);
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