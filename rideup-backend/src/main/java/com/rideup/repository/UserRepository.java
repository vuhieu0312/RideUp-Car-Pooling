package com.rideup.repository;

import com.rideup.entity.User;
import com.rideup.enums.AccountStatus;
import com.rideup.enums.Role;
import org.springframework.data.jpa.repository.Modifying;
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

    @Query(value = """
            SELECT u.id AS id,
                   u.full_name AS fullName,
                   u.email AS email,
                   u.phone AS phone,
                   u.date_of_birth AS dateOfBirth,
                   u.gender AS gender,
                   u.avatar_url AS avatarUrl,
                   r.role AS role,
                   u.account_status AS accountStatus,
                   u.violation_count AS violationCount,
                   u.created_at AS createdAt,
                   u.updated_at AS updatedAt
            FROM app_user u
            JOIN user_roles r ON r.user_id = u.id
            WHERE r.role = :role
              AND NOT EXISTS (
                  SELECT 1 FROM user_roles admin_role
                  WHERE admin_role.user_id = u.id AND admin_role.role = 'ADMIN'
              )
            ORDER BY u.created_at DESC
            """, nativeQuery = true)
    List<AdminUserProjection> findAdminAccountsByRole(@Param("role") String role);

    @Query(value = """
            SELECT u.id AS id,
                   u.full_name AS fullName,
                   u.email AS email,
                   u.phone AS phone,
                   u.date_of_birth AS dateOfBirth,
                   u.gender AS gender,
                   u.avatar_url AS avatarUrl,
                   r.role AS role,
                   u.account_status AS accountStatus,
                   u.violation_count AS violationCount,
                   u.created_at AS createdAt,
                   u.updated_at AS updatedAt
            FROM app_user u
            JOIN user_roles r ON r.user_id = u.id
            WHERE u.id = :userId
              AND r.role IN ('CUSTOMER', 'DRIVER')
              AND NOT EXISTS (
                  SELECT 1 FROM user_roles admin_role
                  WHERE admin_role.user_id = u.id AND admin_role.role = 'ADMIN'
              )
            ORDER BY CASE WHEN r.role = 'DRIVER' THEN 0 ELSE 1 END
            LIMIT 1
            """, nativeQuery = true)
    Optional<AdminUserProjection> findAdminAccountById(@Param("userId") String userId);

    @Modifying
    @Query(value = """
            UPDATE app_user
            SET account_status = :status,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :userId
              AND EXISTS (
                  SELECT 1
                  FROM user_roles r
                  WHERE r.user_id = app_user.id
                    AND r.role IN ('CUSTOMER', 'DRIVER')
                    AND NOT EXISTS (
                        SELECT 1 FROM user_roles admin_role
                        WHERE admin_role.user_id = app_user.id AND admin_role.role = 'ADMIN'
                    )
              )
            """, nativeQuery = true)
    int updateManagedAccountStatus(
            @Param("userId") String userId,
            @Param("status") String status
    );

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
