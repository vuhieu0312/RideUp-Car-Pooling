package com.rideup.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/** Khởi tạo Stripe SDK bằng secret key — pattern từ code mẫu user cung cấp. */
@Configuration
@Slf4j
public class StripeConfig {

    @Value("${stripe.secret-key:}")
    private String secretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
        String masked = (secretKey != null && secretKey.length() > 12)
            ? secretKey.substring(0, 12) + "...(" + secretKey.length() + " chars)"
            : "EMPTY";
        if (secretKey == null || secretKey.isBlank()) {
            log.warn("[DEBUG] Stripe secret-key EMPTY → Stripe Session sẽ fail. Set STRIPE_SECRET_KEY env var.");
        } else {
            log.info("[DEBUG] Stripe SDK initialized OK. apiKey={}", masked);
        }
    }
}