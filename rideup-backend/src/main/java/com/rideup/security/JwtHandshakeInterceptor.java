package com.rideup.security;

import com.rideup.constant.RedisKey;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.List;
import java.util.Map;

/**
 * Validate JWT trong WebSocket handshake.
 * Đọc token từ query param `?token=...` (ưu tiên) hoặc `Authorization: Bearer ...` header.
 * Nếu hợp lệ + còn trong Redis → lưu userId/roles vào session attributes.
 * Nếu không → return false → handshake fail, client nhận 401.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final RedisTemplate<String, Object> redisTemplate;

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

        // 2. Authorization header (cho client gửi được custom header)
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