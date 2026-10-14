import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../theme';

/** Bản đồ điểm đón/trả — iOS/Android: react-native-maps (giống app khách hàng). */
export default function BookingMap({ pickup, dropoff, height = 170 }) {
  const mapRef = useRef(null);
  const points = [pickup, dropoff].filter(Boolean).map((p) => ({ latitude: p.lat, longitude: p.lng }));
  if (points.length === 0) return null;

  // Zoom vừa khung cả điểm đón và điểm trả
  function fit() {
    if (points.length === 1) return;
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: false,
    });
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ ...points[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        onMapReady={fit}
        onLayout={fit}
      >
        {pickup && (
          <Marker coordinate={points[0]} title="Điểm đón" pinColor="#0caf63" />
        )}
        {dropoff && (
          <Marker coordinate={points[points.length - 1]} title="Điểm trả" pinColor="#e5484d" />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceMuted,
  },
  map: { flex: 1 },
});
