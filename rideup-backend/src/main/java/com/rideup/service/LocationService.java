package com.rideup.service;

import com.rideup.exception.AppException;
import com.rideup.dto.response.ProvinceResponse;
import com.rideup.dto.response.WardResponse;
import com.rideup.entity.Province;
import com.rideup.entity.Ward;
import com.rideup.repository.ProvinceRepository;
import com.rideup.repository.WardRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Transactional(readOnly = true)
public class LocationService {

    ProvinceRepository provinceRepository;
    WardRepository wardRepository;

    public List<ProvinceResponse> listProvinces(String keyword) {
        List<Province> all = provinceRepository.findAll();
        return all.stream()
            .filter(p -> keyword == null || keyword.isBlank()
                || p.getName().toLowerCase().contains(keyword.toLowerCase())
                || (p.getCode() != null && p.getCode().toLowerCase().contains(keyword.toLowerCase())))
            .sorted(Comparator.comparing(Province::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toProvinceResponse)
            .toList();
    }

    public ProvinceResponse getProvince(String id) {
        Province p = provinceRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy tỉnh"));
        return toProvinceResponse(p);
    }

    public List<WardResponse> listWards(String provinceId, String keyword) {
        List<Ward> wards = (provinceId == null || provinceId.isBlank())
            ? wardRepository.findAll()
            : wardRepository.findByProvinceId(provinceId);
        return wards.stream()
            .filter(w -> keyword == null || keyword.isBlank()
                || w.getName().toLowerCase().contains(keyword.toLowerCase())
                || (w.getCode() != null && w.getCode().toLowerCase().contains(keyword.toLowerCase())))
            .sorted(Comparator.comparing(Ward::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toWardResponse)
            .toList();
    }

    public WardResponse getWard(String id) {
        Ward w = wardRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy phường/xã"));
        return toWardResponse(w);
    }

    public Province getProvinceEntity(String id) {
        return provinceRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy tỉnh"));
    }

    public Ward getWardEntity(String id) {
        return wardRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy phường/xã"));
    }

    private ProvinceResponse toProvinceResponse(Province p) {
        return ProvinceResponse.builder()
            .id(p.getId())
            .name(p.getName())
            .code(p.getCode())
            .lat(p.getLat())
            .lng(p.getLng())
            .osmid(p.getOsmId())
            .build();
    }

    private WardResponse toWardResponse(Ward w) {
        Province p = w.getProvince();
        return WardResponse.builder()
            .id(w.getId())
            .provinceId(p != null ? p.getId() : null)
            .provinceName(p != null ? p.getName() : null)
            .name(w.getName())
            .code(w.getCode())
            .displayName(w.getDisplayName())
            .lat(w.getLat())
            .lng(w.getLng())
            .osmId(w.getOsmId())
            .build();
    }
}
