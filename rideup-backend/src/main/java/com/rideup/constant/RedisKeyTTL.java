package com.rideup.constant;

import java.time.Duration;

public final class RedisKeyTTL {

    public static final Duration ACCESS_TOKEN_TTL  = Duration.ofMinutes(15);

    public static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(30);

    private RedisKeyTTL() {}
}
