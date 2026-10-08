package com.rideup.repository;

import com.rideup.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Optional<User> findByPhone(String phone);

    List<User> findByIdIn(Collection<String> ids);

    /** Unique check khi update profile — loại trừ chính user đang sửa. */
    boolean existsByPhoneAndIdNot(String phone, String id);
}
