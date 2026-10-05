package com.rideup.repository;

import com.rideup.entity.Ward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WardRepository extends JpaRepository<Ward, String> {

    List<Ward> findByProvinceId(String provinceId);

    Optional<Ward> findByCode(String code);

    Optional<Ward> findByOsmid(Long osmid);

    boolean existsByOsmid(Long osmid);

    long countByProvinceId(String provinceId);
}
