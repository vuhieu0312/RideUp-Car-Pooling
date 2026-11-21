package com.rideup.constant;

public final class RedisKey {
    public static final String ACCESS_TOKEN  = "auth:access:";
    public static final String REFRESH_TOKEN = "auth:refresh:";
    public static final String STRIPE_EVENT  = "stripe:event:";
    public static final String COMMISSION_PERCENT = "config:commission-percent";
    public static final String DEBT_LIMIT = "config:debt-limit";
    private RedisKey() {}
}