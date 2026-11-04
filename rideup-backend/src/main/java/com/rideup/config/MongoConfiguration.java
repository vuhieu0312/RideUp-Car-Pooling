package com.rideup.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class MongoConfiguration {


    @Bean
    public MongoClient mongoClient() {
        return MongoClients.create(
                "mongodb://localhost:27017"
        );
    }


    @Bean
    public MongoTemplate mongoTemplate(
            MongoClient mongoClient
    ){
        return new MongoTemplate(
                mongoClient,
                "rideup_chat"
        );
    }

}