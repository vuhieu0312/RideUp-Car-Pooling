package com.rideup.repository;

import com.rideup.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProvinceRepository extends JpaRepository<Province, String> {

    Optional<Province> findByCode(String code);

    Optional<Province> findByOsmId(Long osmId);
}
