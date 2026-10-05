package com.rideup.security;

import com.rideup.exception.AppException;
import com.rideup.constant.RedisKey;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(req, res);
            return;
        }
        String token = header.substring(7);
        try {
            Claims claims = jwtService.parse(token);
            String type = claims.get("type", String.class);
            if (!JwtClaim.ACCESS.getValue().equals(type)) {
                throw AppException.unauthorized("Invalid token type");
            }

            Object cached = redisTemplate.opsForValue().get(RedisKey.ACCESS_TOKEN + token);
            if (cached == null) {
                log.debug("Access token not in Redis (revoked or expired)");
                SecurityContextHolder.clearContext();
                chain.doFilter(req, res);
                return;
            }

            String userId = claims.getSubject();
            UserDetails userDetails = userDetailsService.loadById(userId);
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
            SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (JwtException ex) {
            log.debug("JWT parse error: {}", ex.getMessage());
            SecurityContextHolder.clearContext();
        }
        chain.doFilter(req, res);
    }
}
