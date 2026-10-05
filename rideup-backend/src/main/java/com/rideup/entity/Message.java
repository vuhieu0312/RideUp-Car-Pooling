package com.rideup.entity;

import com.rideup.enums.MessageType;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Message {

    @Id
    String id;

    @Indexed
    String conversationId;

    @Indexed
    String senderId;

    MessageType type;

    String content;

    String mediaUrl;

    LocalDateTime deletedAt;

    String deletedBy;

    @CreatedDate
    LocalDateTime createdAt;
}
