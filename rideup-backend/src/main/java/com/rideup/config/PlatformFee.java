package com.rideup.config;

import com.rideup.constant.RedisKey;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
@RequiredArgsConstructor
public class PlatformFee {

    public static final int MAX_PERCENT = 50;

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${stripe.connect.platform-fee-percent:10}")
    private int defaultPercent;

    public int getPercent() {
        Object value = redisTemplate.opsForValue().get(RedisKey.COMMISSION_PERCENT);
        if (value == null) {
            return defaultPercent;
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return defaultPercent;
        }
    }

    public void setPercent(int percent) {
        redisTemplate.opsForValue().set(RedisKey.COMMISSION_PERCENT, String.valueOf(percent));
    }

    public BigDecimal of(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(getPercent())).divide(BigDecimal.valueOf(100), 2, RoundingMode.DOWN);
    }
}
