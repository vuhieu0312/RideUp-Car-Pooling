package com.rideup.security;

import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.VehicleRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DocumentAccessInterceptor implements HandlerInterceptor {

    private static final List<String> PRIVATE_PREFIXES = List.of(
        "cccd-front-", "cccd-back-", "gplx-", "vehicle-reg-"
    );

    private final DriverProfileRepository driverProfileRepository;
    private final VehicleRepository vehicleRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String filename = path.substring(path.lastIndexOf('/') + 1);
        if (PRIVATE_PREFIXES.stream().noneMatch(filename::startsWith)) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserDetails user)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        boolean isAdmin = auth.getAuthorities().stream()
            .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        String userId = user.getUsername();
        if (isAdmin
                || driverProfileRepository.ownsDocument(userId, path)
                || vehicleRepository.ownsDocument(userId, path)) {
            return true;
        }
        response.sendError(HttpServletResponse.SC_FORBIDDEN);
        return false;
    }
}
