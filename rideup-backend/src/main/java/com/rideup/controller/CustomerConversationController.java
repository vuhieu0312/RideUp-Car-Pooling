package com.rideup.controller;

import com.rideup.dto.response.ChatConversationResponse;
import com.rideup.exception.ApiResponse;
import com.rideup.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/customer/conversations")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerConversationController {

    private final ConversationService conversationService;

    @GetMapping
    public ApiResponse<List<ChatConversationResponse>> listMine(Authentication authentication) {
        String customerId = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ApiResponse.success(conversationService.listCustomerConversations(customerId));
    }
}