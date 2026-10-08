package com.rideup.repository;

import com.rideup.entity.Ward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WardRepository extends JpaRepository<Ward, String> {

    @Query("SELECT w FROM Ward w WHERE w.province.id = :provinceId ORDER BY w.name")
    List<Ward> findByProvinceId(@Param("provinceId") String provinceId);

    Optional<Ward> findByCode(String code);

    Optional<Ward> findByOsmId(Long osmId);

    boolean existsByOsmId(Long osmId);

    @Query("SELECT COUNT(w) FROM Ward w WHERE w.province.id = :provinceId")
    long countByProvinceId(@Param("provinceId") String provinceId);

    @Query("SELECT COUNT(w) FROM Ward w WHERE w.province.id = :provinceId AND w.osmId IS NOT NULL")
    long countByProvinceIdAndOsmIdNotNull(@Param("provinceId") String provinceId);
}
