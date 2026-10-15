package com.rideup.constant;

public final class RedisKey {
    public static final String ACCESS_TOKEN  = "auth:access:";
    public static final String REFRESH_TOKEN = "auth:refresh:";
    public static final String STRIPE_EVENT  = "stripe:event:";
    private RedisKey() {}
}