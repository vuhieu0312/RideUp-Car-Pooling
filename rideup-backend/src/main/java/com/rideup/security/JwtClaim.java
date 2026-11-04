package com.rideup.security;

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
}
