package com.rideup.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProvinceResponse {
    String id;
    String name;
    String code;          // "HCM", "HN", "DN" — dùng cho Trip search
    BigDecimal lat;
    BigDecimal lng;
    Long osmid;
}