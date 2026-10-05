package com.rideup.repository;

import com.rideup.entity.ConversationMember;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationMemberRepository extends MongoRepository<ConversationMember, String> {

    List<ConversationMember> findByConversationId(String conversationId);

    List<ConversationMember> findByUserId(String userId);

    Optional<ConversationMember> findByConversationIdAndUserId(String conversationId, String userId);

    boolean existsByConversationIdAndUserId(String conversationId, String userId);

    void deleteByConversationIdAndUserId(String conversationId, String userId);
}
