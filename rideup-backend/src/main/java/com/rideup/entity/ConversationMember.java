package com.rideup.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Document(collection = "conversation_members")
@CompoundIndexes({
    @CompoundIndex(name = "conv_user_idx", def = "{'conversationId': 1, 'userId': 1}", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationMember implements Serializable {

    @Id
    String id;

    String conversationId;

    String userId;

    LocalDateTime lastReadAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationMemberId implements Serializable {
        String conversationId;
        String userId;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ConversationMemberId that)) return false;
            return Objects.equals(conversationId, that.conversationId)
                && Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(conversationId, userId);
        }
    }
}
