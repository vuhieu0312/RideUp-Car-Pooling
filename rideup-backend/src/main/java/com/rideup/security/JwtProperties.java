package com.rideup.security;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@FieldDefaults(level = AccessLevel.PRIVATE)
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {
    String secret;
    long accessTokenExpirationMs;
    long refreshTokenExpirationMs;
}
