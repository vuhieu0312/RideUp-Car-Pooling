package com.rideup.repository;

import com.rideup.entity.CallSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CallSessionRepository extends MongoRepository<CallSession, String> {

    Optional<CallSession> findByRequestId(String requestId);
}
