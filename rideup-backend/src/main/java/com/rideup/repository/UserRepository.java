package com.rideup.repository;

import com.rideup.entity.User;
import com.rideup.enums.AccountStatus;
import com.rideup.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import jakarta.persistence.LockModeType;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    long countByRole(Role role);

    long countByRoleNot(Role role);

    long countByRoleAndAccountStatus(Role role, AccountStatus accountStatus);

    long countByRoleAndCreatedAtGreaterThanEqual(Role role, LocalDateTime from);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    // kiểm tra trùng khi sửa profile, bỏ qua chính user đó
    boolean existsByPhoneAndIdNot(String phone, String id);

    @Query("select u.id from User u where u.role = :role")
    List<String> findIdsByRole(@Param("role") Role role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") String id);
}
