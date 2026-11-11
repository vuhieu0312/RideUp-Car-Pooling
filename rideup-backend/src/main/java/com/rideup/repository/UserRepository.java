package com.rideup.repository;

import com.rideup.entity.User;
import com.rideup.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    // kiểm tra trùng khi sửa profile, bỏ qua chính user đó
    boolean existsByPhoneAndIdNot(String phone, String id);

    @Query("select u.id from User u join u.roles r where r = :role")
    List<String> findIdsByRole(@Param("role") Role role);
}
