package com.rideup.security;

import com.rideup.entity.User;
import com.rideup.enums.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

/**
 * Sinh và verify JWT token cho access + refresh.
 *
 * <p>Token type dùng {@link JwtClaim} (enum) để tránh hardcode "access"/"refresh" rải rác.</p>
 */
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties props;
    private SecretKey key;

    @PostConstruct
    void init() {
        byte[] bytes = props.getSecret().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
    }

    /**
     * Sinh access token có TTL theo JwtProperties.accessTokenExpirationMs.
     */
    public String generateAccessToken(User user) {
        return buildToken(user, props.getAccessTokenExpirationMs(), JwtClaim.ACCESS);
    }

    /**
     * Sinh refresh token có TTL theo JwtProperties.refreshTokenExpirationMs.
     */
    public String generateRefreshToken(User user) {
        return buildToken(user, props.getRefreshTokenExpirationMs(), JwtClaim.REFRESH);
    }

    /**
     * Parse + verify JWT. Throw JwtException nếu token invalid/expired/signature sai.
     */
    public Claims parse(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private String buildToken(User user, long ttlMs, JwtClaim type) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + ttlMs);
        List<String> roles = user.getRoles().stream().map(Role::name).toList();

        return Jwts.builder()
            .subject(user.getId())
            .claim("email", user.getEmail())
            .claim("roles", roles)
            .claim("type", type.getValue())
            .issuedAt(now)
            .expiration(expiry)
            .signWith(key)
            .compact();
    }
}
