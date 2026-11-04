package com.rideup.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
        basePackages = "com.rideup.repository",
        mongoTemplateRef = "mongoTemplate"
)
public class MongoConfig {

}