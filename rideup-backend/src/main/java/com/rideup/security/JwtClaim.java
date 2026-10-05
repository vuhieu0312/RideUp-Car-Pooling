package com.rideup.security;

/**
 * Loại token JWT dùng trong hệ thống.
 *
 * <p>Token type được nhúng vào claim {@code type} để JwtAuthFilter phân biệt
 * access token với refresh token khi xác thực request.</p>
 */
public enum JwtClaim {
    ACCESS("access"),
    REFRESH("refresh");

    private final String value;

    JwtClaim(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static JwtClaim fromValue(String value) {
        for (JwtClaim c : values()) {
            if (c.value.equals(value)) return c;
        }
        throw new IllegalArgumentException("Unknown JWT claim type: " + value);
    }
}
