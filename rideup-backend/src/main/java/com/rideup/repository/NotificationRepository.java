package com.rideup.repository;

import com.rideup.entity.Notification;
import com.rideup.enums.ReadStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    long countByUserIdAndStatus(String userId, ReadStatus status);

    @Modifying
    @Query("UPDATE Notification n SET n.status = :read, n.readAt = :now WHERE n.user.id = :userId AND n.status = :unread")
    void markAllAsRead(@Param("userId") String userId,
                       @Param("read") ReadStatus read,
                       @Param("unread") ReadStatus unread,
                       @Param("now") LocalDateTime now);
}
