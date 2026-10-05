package com.rideup.entity;

import com.rideup.enums.CallStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "call_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CallSession {

    @Id
    String id;

    @Indexed
    String conversationId;

    @Indexed(unique = true)
    String requestId;

    @Indexed
    String calleeId;

    CallStatus status;

    LocalDateTime startedAt;

    LocalDateTime endedAt;
}
