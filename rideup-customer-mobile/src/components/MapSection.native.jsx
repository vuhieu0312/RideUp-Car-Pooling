import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../theme';

/** MapSection — NATIVE (iOS/Android). */
export default function MapSection({
  region,
  onCoordChange,
  strokeColor,
  hasCoord,
  lat,
  lng,
  loadingWard,
}) {
  // Trước đây truyền `region` (controlled): mỗi lần component render lại (đang tải địa chỉ, gõ chữ…)
  // map bị ép nhảy về region → kéo/zoom bị giật, bấm tiếp khó. Giờ chỉ đặt vị trí ban đầu và
  // tự animate khi toạ độ đích thật sự thay đổi (bấm điểm mới, chọn gợi ý, đổi phường).
  const mapRef = useRef(null);
  const regionKey = `${region.latitude.toFixed(5)},${region.longitude.toFixed(5)},${region.latitudeDelta}`;
  useEffect(() => {
    mapRef.current?.animateToRegion(region, 300);
  }, [regionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      {loadingWard && (
        <View style={styles.overlay}>
          <ActivityIndicator color={strokeColor} />
        </View>
      )}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onCoordChange(latitude, longitude);
        }}
      >
        {hasCoord && (
          <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={strokeColor} />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: 8,
    backgroundColor: colors.surfaceMuted,
  },
  map: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
});
