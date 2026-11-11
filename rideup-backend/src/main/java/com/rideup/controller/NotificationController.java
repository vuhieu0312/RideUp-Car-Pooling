package com.rideup.controller;

import com.rideup.dto.response.NotificationResponse;
import com.rideup.exception.ApiResponse;
import com.rideup.service.NotificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationController {

    NotificationService notificationService;

    @GetMapping
    public ApiResponse<List<NotificationResponse>> list(
        Authentication auth,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(notificationService.list(currentUserId(auth), page, size));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> unreadCount(Authentication auth) {
        return ApiResponse.success(notificationService.unreadCount(currentUserId(auth)));
    }

    @PostMapping("/{id}/read")
    public ApiResponse<Void> markRead(Authentication auth, @PathVariable String id) {
        notificationService.markRead(currentUserId(auth), id);
        return ApiResponse.success(null);
    }

    @PostMapping("/read-all")
    public ApiResponse<Void> markAllRead(Authentication auth) {
        notificationService.markAllRead(currentUserId(auth));
        return ApiResponse.success(null);
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
