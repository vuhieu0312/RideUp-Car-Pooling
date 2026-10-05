package com.rideup.security;

import com.rideup.constant.RedisKey;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
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
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.List;
import java.util.Map;

/**
 * Xử lý JWT cho WebSocket ở cả 2 giai đoạn:
 *
 * <ol>
 *   <li><b>Handshake</b> (WebSocket upgrade): validate JWT trong query/header.
 *       Nếu fail → return false → handshake reject, client nhận 401.</li>
 *   <li><b>STOMP CONNECT</b> (message phase): set Authentication principal
 *       từ session attributes đã lưu ở handshake. KHÔNG validate lại JWT.</li>
 * </ol>
 *
 * Gộp 2 interceptor thành 1 class vì cùng chung mục đích (auth WebSocket)
 * và cùng dùng JwtService + Redis. Implementation 2 interface tiện hơn tách
 * 2 class (chung lifecycle, copy-paste code).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtWsAuthInterceptor implements HandshakeInterceptor, ChannelInterceptor {

    private final JwtService jwtService;
    private final RedisTemplate<String, Object> redisTemplate;

    // ============================================================
    // HandshakeInterceptor (gọi 1 lần khi client upgrade WebSocket)
    // ============================================================
    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        String token = extractToken(request);
        if (token == null) {
            log.debug("WebSocket handshake rejected: no token");
            return false;
        }
        try {
            Claims claims = jwtService.parse(token);
            String type = claims.get("type", String.class);
            if (!JwtClaim.ACCESS.getValue().equals(type)) {
                log.debug("WebSocket handshake rejected: wrong token type");
                return false;
            }

            Object cached = redisTemplate.opsForValue()
                .get(RedisKey.ACCESS_TOKEN + token);
            if (cached == null) {
                log.debug("WebSocket handshake rejected: token revoked or expired");
                return false;
            }

            attributes.put("userId", claims.getSubject());
            Object rolesClaim = claims.get("roles");
            if (rolesClaim instanceof List<?> list) {
                @SuppressWarnings("unchecked")
                List<String> typedRoles = (List<String>) list;
                attributes.put("roles", typedRoles);
            }
            return true;
        } catch (Exception e) {
            log.debug("WebSocket handshake rejected: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // no-op
    }

    // ============================================================
    // ChannelInterceptor (gọi trên từng STOMP message)
    // ============================================================
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        // Chỉ set principal khi STOMP CONNECT — các message khác (SEND/SUBSCRIBE)
        // giữ nguyên principal đã set ở CONNECT.
        if (!StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

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

        return message;
    }

    // ============================================================
    // Helpers
    // ============================================================
    private String extractToken(ServerHttpRequest request) {
        // 1. Query param: ws://host/ws?token=xxx
        String query = request.getURI().getQuery();
        if (query != null) {
            for (String param : query.split("&")) {
                if (param.startsWith("token=")) {
                    return param.substring("token=".length());
                }
            }
        }

        // 2. Authorization header
        List<String> headers = request.getHeaders().get("Authorization");
        if (headers != null && !headers.isEmpty()) {
            String auth = headers.get(0);
            if (auth.startsWith("Bearer ")) {
                return auth.substring(7);
            }
        }
        return null;
    }
}