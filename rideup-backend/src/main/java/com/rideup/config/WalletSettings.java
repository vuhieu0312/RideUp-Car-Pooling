package com.rideup.config;

import com.rideup.constant.RedisKey;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WalletSettings {

    public static final long MAX_DEBT_LIMIT = 10_000_000L;

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${app.wallet.debt-limit-vnd:0}")
    private long defaultDebtLimit;

    public long getDebtLimit() {
        Object value = redisTemplate.opsForValue().get(RedisKey.DEBT_LIMIT);
        if (value == null) {
            return defaultDebtLimit;
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return defaultDebtLimit;
        }
    }

    public void setDebtLimit(long limit) {
        redisTemplate.opsForValue().set(RedisKey.DEBT_LIMIT, String.valueOf(limit));
    }
}
