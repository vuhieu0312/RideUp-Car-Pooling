import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getWardById } from '../api/api';
import MapSection from './MapSection';
import { colors } from '../theme';
import { Text, TextInput } from './Typography';

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_COORD = { latitude: 16.047079, longitude: 108.20623 };

/** Ngưỡng phân loại kết quả */
const WARD_RADIUS_KM = 40;
const PROVINCE_RADIUS_KM = 80;
const FETCH_TIMEOUT_MS = 5000;

// ── Helpers ────────────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValid(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0)
  );
}

// Icon theo loại OSM (để suggestion list dễ scan bằng mắt)
function iconForOsm(osmValue, type) {
  switch (osmValue) {
    case 'school':
    case 'university':
    case 'college':
      return 'school-outline';
    case 'hospital':
    case 'clinic':
    case 'pharmacy':
      return 'hospital-box-outline';
    case 'restaurant':
    case 'cafe':
    case 'fast_food':
    case 'food':
      return 'silverware-fork-knife';
    case 'bank':
      return 'credit-card-outline';
    case 'place':
      return 'city-variant-outline';
    default:
      return type === 'street' ? 'navigation-variant-outline' : 'pin-outline';
  }
}

// fetch với timeout riêng — fetch() trần không có timeout mặc định, nếu server (đặc biệt photon.komoot.io, server demo công cộng free, không SLA) bị...
async function fetchWithTimeout(url, ms = FETCH_TIMEOUT_MS, extraOptions = {}) {
  // `signal` trong extraOptions (nếu có) là AbortSignal của CALLER (vd: huỷ khi user gõ tiếp) — không gán thẳng vào fetch() vì sẽ bị ctrl.signal của...
  const { signal: callerSignal, ...restOptions } = extraOptions;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), ms);
  const onCallerAbort = () => ctrl.abort();
  if (callerSignal) callerSignal.addEventListener('abort', onCallerAbort);
  try {
    return await fetch(url, { ...restOptions, signal: ctrl.signal });
  } finally {
    clearTimeout(timeoutId);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

// Timeout riêng cho reverse geocode — ngắn hơn forward (5s) vì đây là lúc user đang
// chờ trực tiếp sau khi bấm ghim map, cần phản hồi nhanh hơn lúc gõ-tìm-kiếm.
const REVERSE_TIMEOUT_MS = 4000;

// Header bắt buộc theo usage policy của Nominatim (OSM chính chủ) — không có User-Agent
// nhận diện app thì request có thể bị họ chặn khi traffic tăng.
const NOMINATIM_HEADERS = { 'User-Agent': 'RideUpApp/1.0 (student project)' };

/** Mỗi nguồn trả về string "Số nhà + tên đường, phường/quận, thành phố" khi có đủ dữ liệu, throw nếu không có gì dùng được (để không làm "thắng" một... */
async function reverseGeocodePhoton(lat, lng) {
  const res = await fetchWithTimeout(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`, REVERSE_TIMEOUT_MS);
  if (!res.ok) throw new Error('photon not ok');
  const data = await res.json();
  const props = data.features?.[0]?.properties;
  // housenumber + street ghép lại ("73 Phùng Khoang") thay vì chỉ street suông
  const streetLine = [props?.housenumber, props?.street].filter(Boolean).join(' ');
  const parts = [streetLine || props?.name, props?.district, props?.city, props?.country].filter(Boolean);
  if (parts.length === 0) throw new Error('photon empty');
  return [...new Set(parts)].join(', ');
}

async function reverseGeocodeNominatim(lat, lng) {
  const res = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&accept-language=vi`,
    REVERSE_TIMEOUT_MS,
    { headers: NOMINATIM_HEADERS },
  );
  if (!res.ok) throw new Error('nominatim not ok');
  const data = await res.json();
  const a = data.address;
  if (!a) throw new Error('nominatim empty');
  // Nominatim trả address chi tiết nhất trong 3 nguồn: house_number, road riêng biệt
  const road = a.road || a.pedestrian || a.footway || a.residential;
  const streetLine = [a.house_number, road].filter(Boolean).join(' ');
  const parts = [
    streetLine,
    a.suburb || a.quarter || a.neighbourhood || a.hamlet,
    a.city_district || a.district || a.county,
    a.city || a.town || a.village,
  ].filter(Boolean);
  if (parts.length === 0) throw new Error('nominatim empty');
  return [...new Set(parts)].join(', ');
}

async function reverseGeocodeBigDataCloud(lat, lng) {
  const res = await fetchWithTimeout(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`,
    REVERSE_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error('bigdatacloud not ok');
  const data = await res.json();
  const parts = [data.locality, data.city, data.principalSubdivision, data.countryName].filter(Boolean);
  if (parts.length === 0) throw new Error('bigdatacloud empty');
  return [...new Set(parts)].join(', ');
}

async function reverseGeocode(lat, lng) {
  // Gọi SONG SONG cả 3 nguồn (Nominatim chi tiết nhất — có số nhà/tên đường riêng; Photon khá hơn BigDataCloud nhưng không phải lúc nào cũng có...
  const results = await Promise.allSettled([
    reverseGeocodeNominatim(lat, lng),
    reverseGeocodePhoton(lat, lng),
    reverseGeocodeBigDataCloud(lat, lng),
  ]);
  const candidates = results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
  if (candidates.length === 0) return '';
  // Ưu tiên chuỗi có nhiều phần (dấu phẩy) hơn = chi tiết hơn (có số nhà/tên đường
  // riêng thay vì chỉ "Đại Mỗ, Hà Nội, Việt Nam")
  candidates.sort((a, b) => b.split(',').length - a.split(',').length);
  return candidates[0];
}

/** Forward geocoding: search địa chỉ → danh sách kết quả. */
async function forwardGeocodePhoton(q, biasLat, biasLng, signal) {
  const params = new URLSearchParams({ q, limit: '12' });
  if (Number.isFinite(biasLat) && Number.isFinite(biasLng)) {
    params.set('lat', String(biasLat));
    params.set('lon', String(biasLng));
  }
  const url = `https://photon.komoot.io/api/?${params.toString()}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  const features = data?.features || [];
  const results = [];
  for (const f of features) {
    const [lng, lat] = f.geometry?.coordinates || [];
    if (!isValid(lat, lng)) continue;
    const p = f.properties || {};
    const primary = p.name || p.street || p.locality || '—';
    const secondaryParts = [p.street && p.name ? p.street : null, p.suburb || p.district, p.city, p.country]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
    results.push({
      lat, lng, primary, secondary: secondaryParts.join(', '),
      type: p.type, osmValue: p.osm_value,
    });
  }
  return results;
}

/** Nominatim search — nguồn thứ 2 cho forward search, chạy song song với Photon. */
async function forwardGeocodeNominatim(q, biasLat, biasLng, signal) {
  const params = new URLSearchParams({
    q, format: 'jsonv2', addressdetails: '1', limit: '10',
    countrycodes: 'vn', 'accept-language': 'vi',
  });
  if (Number.isFinite(biasLat) && Number.isFinite(biasLng)) {
    // viewbox quanh điểm bias ~2 độ (~220km) để ưu tiên kết quả gần, không filter cứng
    params.set('viewbox', `${biasLng - 2},${biasLat + 2},${biasLng + 2},${biasLat - 2}`);
  }
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, { signal, headers: NOMINATIM_HEADERS });
  if (!res.ok) return [];
  const data = await res.json();
  const results = [];
  for (const item of data || []) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!isValid(lat, lng)) continue;
    const a = item.address || {};
    const road = a.road || a.pedestrian || a.footway || a.residential;
    const streetLine = [a.house_number, road].filter(Boolean).join(' ');
    const primary = item.name || streetLine || a.amenity || (item.display_name || '').split(',')[0] || '—';
    const secondaryParts = [
      streetLine && streetLine !== primary ? streetLine : null,
      a.suburb || a.quarter || a.neighbourhood,
      a.city_district || a.district,
      a.city || a.town || a.village,
    ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);
    results.push({
      lat, lng, primary, secondary: secondaryParts.join(', '),
      type: item.type, osmValue: item.class,
    });
  }
  return results;
}

async function forwardGeocode(query, provinceLat, provinceLng, wardLat, wardLng, signal) {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  // Bias = tâm tỉnh (nếu có), fallback về tâm xã
  const biasLat = Number.isFinite(provinceLat) ? provinceLat : wardLat;
  const biasLng = Number.isFinite(provinceLng) ? provinceLng : wardLng;

  // Gọi song song 2 nguồn độc lập — nguồn nào lỗi/rỗng/timeout thì bỏ qua, không chặn
  // nguồn còn lại (allSettled, không throw ra ngoài).
  const settled = await Promise.allSettled([
    forwardGeocodePhoton(q, biasLat, biasLng, signal),
    forwardGeocodeNominatim(q, biasLat, biasLng, signal),
  ]);
  const raw = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (signal?.aborted) return [];

  // Dedupe theo toạ độ làm tròn ~11m (4 chữ số thập phân) — 2 nguồn có thể trả cùng
  // 1 điểm, giữ bản ghi đầu tiên gặp (Photon ưu tiên trước vì để ở đầu mảng settled)
  const seen = new Set();
  const results = [];
  for (const r of raw) {
    const { lat, lng } = r;
    if (!isValid(lat, lng)) continue;
    // Filter cứng: chỉ giữ trong tỉnh
    if (Number.isFinite(provinceLat) && Number.isFinite(provinceLng)) {
      const distToProv = haversine(provinceLat, provinceLng, lat, lng) / 1000;
      if (distToProv > PROVINCE_RADIUS_KM) continue;
    }
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const distanceToWardKm = (Number.isFinite(wardLat) && Number.isFinite(wardLng))
      ? haversine(wardLat, wardLng, lat, lng) / 1000
      : null;
    const inWard = distanceToWardKm !== null && distanceToWardKm <= WARD_RADIUS_KM;
    results.push({ ...r, distanceToWardKm, inWard });
  }
  // Sort: trong ward trước (theo distance tới ward), ngoài ward sau
  results.sort((a, b) => {
    if (a.inWard && !b.inWard) return -1;
    if (!a.inWard && b.inWard) return 1;
    return (a.distanceToWardKm ?? Infinity) - (b.distanceToWardKm ?? Infinity);
  });
  return results;
}

/** LocationMapPicker */
export default function LocationMapPicker({
  title,
  wardOptions = [],
  wardId,
  onWardChange,
  value,
  onChange,
  accentColor = colors.primary,
  wardReadOnly = false,
  wardName,
  provinceLat,
  provinceLng,
}) {
  const [wardCenter, setWardCenter] = useState(null);
  const [loadingWard, setLoadingWard] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showWardList, setShowWardList] = useState(false);
  const [addressSearch, setAddressSearch] = useState('idle'); // 'idle' | 'searching' | 'found' | 'notfound'
  const [suggestions, setSuggestions] = useState([]);
  const searchTimerRef = useRef(null);
  const abortCtrlRef = useRef(null);
  const lastSearchedTextRef = useRef('');

  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  const hasCoord = isValid(lat, lng);

  const selectedWardName = wardName || wardOptions.find((w) => w.id === wardId)?.name || '';

  // Load tâm phường/xã khi wardId thay đổi
  useEffect(() => {
    if (!wardId) { setWardCenter(null); return; }
    let cancelled = false;
    setLoadingWard(true);
    getWardById(wardId)
      .then((ward) => {
        const wLat = Number(ward?.lat);
        const wLng = Number(ward?.lng);
        if (!cancelled) {
          setWardCenter(isValid(wLat, wLng) ? { latitude: wLat, longitude: wLng } : null);
        }
      })
      .catch(() => { if (!cancelled) setWardCenter(null); })
      .finally(() => { if (!cancelled) setLoadingWard(false); });
    return () => { cancelled = true; };
  }, [wardId]);

  const updateFromCoord = useCallback(async (nextLat, nextLng) => {
    setLocalError('');
    setSuggestions([]);
    if (!isValid(nextLat, nextLng)) {
      setLocalError('Tọa độ không hợp lệ. Vui lòng thử lại.');
      return;
    }
    onChange?.({ lat: nextLat, lng: nextLng, addressText: value?.addressText || '' });
    try {
      setResolvingAddress(true);
      const address = await reverseGeocode(nextLat, nextLng);
      if (address) onChange?.({ lat: nextLat, lng: nextLng, addressText: address });
    } catch {
      setLocalError('Không lấy được địa chỉ tự động. Bạn có thể tự nhập bên dưới.');
    } finally {
      setResolvingAddress(false);
    }
  }, [value, onChange]);

  const useCurrentLocation = async () => {
    setLocalError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocalError('Bạn cần cấp quyền vị trí để sử dụng tính năng này.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await updateFromCoord(loc.coords.latitude, loc.coords.longitude);
    } catch {
      setLocalError('Không thể lấy vị trí hiện tại.');
    }
  };

  // Forward geocoding: gõ địa chỉ → debounce → search → sort theo in-ward
  const handleAddressTextChange = useCallback((text) => {
    onChange?.({ lat, lng, addressText: text });
    setSuggestions([]);
    setAddressSearch('idle');
    if (abortCtrlRef.current) abortCtrlRef.current.abort();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = (text || '').trim();
    if (trimmed.length < 5 || trimmed === lastSearchedTextRef.current) return;
    searchTimerRef.current = setTimeout(async () => {
      lastSearchedTextRef.current = trimmed;
      setAddressSearch('searching');
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;
      const results = await forwardGeocode(
        trimmed,
        Number(provinceLat), Number(provinceLng),
        wardCenter?.latitude, wardCenter?.longitude,
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      if (results.length === 0) {
        setAddressSearch('notfound');
        setSuggestions([]);
        return;
      }
      setSuggestions(results.slice(0, 6));
      const hasOutOfWard = results.some((r) => !r.inWard);
      setAddressSearch(hasOutOfWard ? 'found_mixed' : 'found');
    }, 600);
  }, [lat, lng, wardCenter, provinceLat, provinceLng, onChange]);

  // User chọn 1 suggestion → ghim map + set addressText = suggestion primary
  const pickSuggestion = useCallback((s) => {
    onChange?.({ lat: s.lat, lng: s.lng, addressText: s.primary });
    setSuggestions([]);
    setAddressSearch('idle');
  }, [onChange]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const mapRegion = hasCoord
    ? { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : wardCenter
      ? { ...wardCenter, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : { ...DEFAULT_COORD, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  return (
    <View style={styles.wrapper}>

      {/* STEP 1: Chọn Phường/Xã */}
      <View style={styles.sectionHeader}>
        <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.stepText}>1</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: accentColor }]}>
          {wardReadOnly ? `${title} — Phường/Xã` : `${title} — Chọn Phường/Xã`}
        </Text>
      </View>

      {wardReadOnly ? (
        // Read-only: hiển thị ward đã chọn từ bước trước (vd: search trip)
        <View style={[styles.wardInfo, { borderColor: accentColor }]}>
          <MaterialCommunityIcons name="map-marker" size={18} color={accentColor} />
          <Text style={styles.wardInfoText} numberOfLines={1}>{selectedWardName || '—'}</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.wardBtn, wardId && { borderColor: accentColor }]}
            onPress={() => setShowWardList(!showWardList)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={wardId ? accentColor : colors.textSecondary} />
            <Text style={[styles.wardBtnText, wardId && { color: colors.textDark }]} numberOfLines={1}>
              {wardId ? selectedWardName : 'Chọn Phường/Xã...'}
            </Text>
            <MaterialCommunityIcons name={showWardList ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Danh sách phường/xã */}
          {showWardList && (
            <View style={styles.wardList}>
              {wardOptions.length === 0 ? (
                <Text style={styles.emptyText}>Không có phường/xã nào</Text>
              ) : (
                wardOptions.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.wardItem, w.id === wardId && { backgroundColor: `${accentColor}20`, borderColor: accentColor }]}
                    onPress={() => {
                      onWardChange?.(w.id);
                      // Reset tọa độ khi đổi phường
                      onChange?.({ lat: NaN, lng: NaN, addressText: '' });
                      setLocalError('');
                      setShowWardList(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={w.id === wardId ? 'radiobox-marked' : 'radiobox-blank'}
                      size={16}
                      color={w.id === wardId ? accentColor : colors.textSecondary}
                    />
                    <Text style={[styles.wardItemText, w.id === wardId && { color: accentColor, fontWeight: 'bold' }]}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </>
      )}

      {/* STEP 2: Chọn trên bản đồ — chỉ hiện khi đã chọn phường/xã */}
      {wardId ? (
        <>
          <View style={[styles.sectionHeader, { marginTop: 16 }]}>
            <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.stepText}>2</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Ghim vị trí trên bản đồ</Text>
            <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation}>
              <MaterialCommunityIcons name="crosshairs-gps" size={13} color={colors.textDark} />
              <Text style={styles.gpsBtnText}>Vị trí hiện tại</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Bấm vào bản đồ để ghim vị trí chính xác</Text>

          <MapSection
            region={mapRegion}
            onCoordChange={updateFromCoord}
            wardCenter={wardCenter}
            strokeColor={accentColor}
            hasCoord={hasCoord}
            lat={lat}
            lng={lng}
            loadingWard={loadingWard}
          />

          {/* STEP 3: Địa chỉ chi tiết */}
          <View style={[styles.sectionHeader, { marginTop: 12 }]}>
            <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.stepText}>3</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Địa chỉ chi tiết</Text>
            {resolvingAddress && <ActivityIndicator color={accentColor} size="small" style={{ marginLeft: 8 }} />}
          </View>
          <TextInput
            style={styles.addressInput}
            placeholder="Số nhà, tên đường, mốc nhận diện..."
            placeholderTextColor={colors.textMuted}
            value={value?.addressText || ''}
            onChangeText={handleAddressTextChange}
            onFocus={() => { /* giữ suggestions nếu đang có */ }}
          />
          {addressSearch === 'searching' && (
            <View style={styles.searchStatus}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={[styles.searchStatusText, { color: accentColor }]}>Đang tìm...</Text>
            </View>
          )}
          {addressSearch === 'notfound' && (
            <View style={styles.notFoundBox}>
              <View style={styles.notFoundHeader}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.notFoundTitle}>Không tìm thấy địa điểm này</Text>
              </View>
              <Text style={styles.notFoundHint}>
                POI này có thể chưa có trong OpenStreetMap (bản đồ nền dùng cho tìm kiếm). Hãy thử:
                {'\n'}• Gõ tên đường lớn gần đó (vd: ĐT 376, QL 38)
                {'\n'}• Bấm trực tiếp vào bản đồ phía trên
                {'\n'}• Bấm "Vị trí hiện tại" để dùng GPS
              </Text>
            </View>
          )}
          {addressSearch === 'found_mixed' && (
            <View style={styles.searchStatus}>
              <MaterialCommunityIcons name="information-outline" size={14} color={colors.warning} />
              <Text style={[styles.searchStatusText, { color: colors.warning }]}>Một số kết quả nằm ngoài phường/xã (gắn thẻ cam)</Text>
            </View>
          )}
          {suggestions.length > 0 && (
            <View style={styles.suggestionList}>
              {suggestions.map((s, i) => (
                <TouchableOpacity
                  key={`${s.lat}-${s.lng}-${i}`}
                  style={[styles.suggestionItem, !s.inWard && styles.suggestionItemOut]}
                  onPress={() => pickSuggestion(s)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={iconForOsm(s.osmValue, s.type)}
                    size={16}
                    color={s.inWard ? accentColor : colors.warning}
                    style={styles.suggestionIcon}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionPrimary} numberOfLines={1}>{s.primary}</Text>
                    {!!s.secondary && (
                      <Text style={styles.suggestionSecondary} numberOfLines={1}>{s.secondary}</Text>
                    )}
                  </View>
                  {!s.inWard && (
                    <View style={styles.outBadge}>
                      <Text style={styles.outBadgeText}>Ngoài</Text>
                    </View>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.mapPlaceholder}>
          <MaterialCommunityIcons name="map-outline" size={32} color={colors.border} />
          <Text style={styles.mapPlaceholderText}>Chọn Phường/Xã để hiển thị bản đồ</Text>
        </View>
      )}

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  stepText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', flex: 1, letterSpacing: 0.5 },

  // Ward selector
  wardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.borderLight,
    borderRadius: 10, paddingHorizontal: 14, height: 48,
  },
  wardBtnText: { flex: 1, color: colors.textSecondary, fontSize: 14 },
  // Ward info (read-only, khi parent đã chọn sẵn)
  wardInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.surfaceMuted, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 14, height: 48,
  },
  wardInfoText: { color: colors.textDark, fontSize: 14, fontWeight: '600' },
  wardList: {
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.borderLight, marginTop: 4, overflow: 'hidden',
  },
  wardItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bg,
  },
  wardItemText: { color: colors.textDark, fontSize: 14, flex: 1 },
  emptyText: { padding: 14, color: colors.textMuted, fontSize: 12, textAlign: 'center' },

  // GPS button
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted,
    borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, gap: 4,
  },
  gpsBtnText: { color: colors.textDark, fontSize: 11, fontWeight: '600' },
  hint: { color: colors.textSecondary, fontSize: 11, marginBottom: 8 },

  // Map placeholder (khi chưa chọn ward)
  mapPlaceholder: {
    height: 80, backgroundColor: colors.surfaceMuted, borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8,
  },
  mapPlaceholderText: { color: colors.textSecondary, fontSize: 13 },

  // Coords
  distText: { color: colors.textSecondary, fontSize: 11, marginBottom: 8, fontStyle: 'italic' },

  // Address input
  addressInput: {
    backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.borderLight,
    borderRadius: 10, paddingHorizontal: 14, height: 48, color: colors.textDark, fontSize: 14,
  },
  searchStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6, marginLeft: 2,
  },
  searchStatusText: { fontSize: 11, fontStyle: 'italic' },

  // Suggestion list (autocomplete)
  suggestionList: {
    marginTop: 6, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.borderLight, borderRadius: 10, overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.bg,
  },
  suggestionIcon: { marginTop: 1 },
  suggestionPrimary: { color: colors.textDark, fontSize: 13, fontWeight: '600' },
  suggestionSecondary: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  suggestionItemOut: { backgroundColor: '#fef3c7' },
  outBadge: {
    backgroundColor: colors.warning, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginRight: 4,
  },
  outBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },

  // Not found box
  notFoundBox: {
    marginTop: 8, padding: 12, backgroundColor: '#fef3c7',
    borderRadius: 10, borderWidth: 1, borderColor: '#fde68a',
  },
  notFoundHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  notFoundTitle: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  notFoundHint: { color: colors.textDark, fontSize: 11, lineHeight: 17 },
  errorText: { color: colors.danger, fontSize: 11, marginTop: 6 },
});
