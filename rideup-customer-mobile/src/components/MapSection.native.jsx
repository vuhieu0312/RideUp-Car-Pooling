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
  return (
    <View style={styles.container}>
      {loadingWard && (
        <View style={styles.overlay}>
          <ActivityIndicator color={strokeColor} />
        </View>
      )}
      <MapView
        style={styles.map}
        region={region}
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
