package com.rideup;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RideUpApplication {
    public static void main(String[] args) {
        SpringApplication.run(RideUpApplication.class, args);
    }
}
