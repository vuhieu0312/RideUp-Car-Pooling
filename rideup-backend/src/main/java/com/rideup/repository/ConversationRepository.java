package com.rideup.repository;

import com.rideup.entity.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {

    Optional<Conversation> findByBookingId(String bookingId);

    boolean existsByBookingId(String bookingId);
}
