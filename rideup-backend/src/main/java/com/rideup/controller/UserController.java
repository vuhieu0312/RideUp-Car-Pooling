package com.rideup.controller;

import com.rideup.dto.request.ChangePasswordRequest;
import com.rideup.dto.request.UpdateProfileRequest;
import com.rideup.dto.response.UserResponse;
import com.rideup.exception.ApiResponse;
import com.rideup.service.UserService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Endpoint cho user tự quản lý profile. Tất cả đều yêu cầu JWT hợp lệ
 * (kế thừa .anyRequest().authenticated() trong SecurityConfig).
 *
 * <ul>
 *   <li>GET    /api/users/me               — xem thông tin cá nhân</li>
 *   <li>PATCH  /api/users/me               — sửa tên / SĐT / ngày sinh / giới tính</li>
 *   <li>POST   /api/users/me/change-password — đổi mật khẩu (cần mật khẩu cũ)</li>
 *   <li>POST   /api/users/me/avatar        — upload avatar (multipart)</li>
 * </ul>
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {

    UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMyProfile(Authentication auth) {
        return ApiResponse.success(userService.getMyProfile(currentUserId(auth)));
    }

    @PatchMapping("/me")
    public ApiResponse<UserResponse> updateMyProfile(
        Authentication auth,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ApiResponse.success("Cập nhật thông tin thành công",
            userService.updateMyProfile(currentUserId(auth), request));
    }

    @PostMapping("/me/change-password")
    public ApiResponse<Void> changePassword(
        Authentication auth,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(currentUserId(auth), request);
        return ApiResponse.success("Đổi mật khẩu thành công", null);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserResponse> uploadAvatar(
        Authentication auth,
        @RequestParam("avatar") MultipartFile avatar
    ) {
        return ApiResponse.success("Cập nhật avatar thành công",
            userService.updateAvatar(currentUserId(auth), avatar));
    }

    private String currentUserId(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
