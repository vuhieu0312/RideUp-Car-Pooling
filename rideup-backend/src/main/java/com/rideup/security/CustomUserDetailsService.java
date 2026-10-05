package com.rideup.security;

import com.rideup.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService {

    private final com.rideup.repository.UserRepository userRepository;

    public UserDetails loadById(String id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + id));
        return build(user);
    }

    private UserDetails build(User user) {
        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getId())
            .password(user.getPassword())
            .authorities(user.getRoles().stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.name()))
                .collect(Collectors.toSet()))
            .disabled(false)
            .build();
    }
}
