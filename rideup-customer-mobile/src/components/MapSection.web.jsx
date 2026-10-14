import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme';
import { Text, TextInput } from './Typography';

/** MapSection — WEB fallback. */
export default function MapSection({
  region,
  onCoordChange,
  strokeColor,
  hasCoord,
  lat,
  lng,
  loadingWard,
}) {
  async function useWebGPS() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onCoordChange(loc.coords.latitude, loc.coords.longitude);
    } catch {
      // ignore
    }
  }

  function setLat(v) {
    const parsed = parseFloat(v.replace(',', '.'));
    onCoordChange(Number.isFinite(parsed) ? parsed : NaN, lng);
  }
  function setLng(v) {
    const parsed = parseFloat(v.replace(',', '.'));
    onCoordChange(lat, Number.isFinite(parsed) ? parsed : NaN);
  }

  return (
    <View style={styles.container}>
      {loadingWard && (
        <View style={styles.overlay}>
          <ActivityIndicator color={strokeColor} />
        </View>
      )}

      <View style={styles.placeholder}>
        <MaterialCommunityIcons name="map-outline" size={32} color={colors.border} />
        <Text style={styles.title}>Bản đồ chỉ khả dụng trên iOS/Android</Text>
        <Text style={styles.hint}>
          Trên web, nhập tọa độ thủ công hoặc dùng GPS.
        </Text>

        <View style={styles.coordRow}>
          <View style={styles.coordField}>
            <Text style={styles.coordLabel}>Vĩ độ</Text>
            <TextInput
              style={styles.coordInput}
              placeholder="16.047"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={Number.isFinite(lat) ? String(lat) : ''}
              onChangeText={setLat}
            />
          </View>
          <View style={styles.coordField}>
            <Text style={styles.coordLabel}>Kinh độ</Text>
            <TextInput
              style={styles.coordInput}
              placeholder="108.206"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={Number.isFinite(lng) ? String(lng) : ''}
              onChangeText={setLng}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.gpsBtn} onPress={useWebGPS}>
          <MaterialCommunityIcons name="crosshairs-gps" size={14} color={colors.textDark} />
          <Text style={styles.gpsBtnText}>Lấy vị trí hiện tại (GPS)</Text>
        </TouchableOpacity>

        {hasCoord && (
          <Text style={styles.distText}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: 8,
    backgroundColor: colors.surfaceMuted,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  placeholder: {
    flex: 1, padding: 14, justifyContent: 'center', alignItems: 'center', gap: 8,
    borderStyle: 'dashed', borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12,
    margin: 4,
  },
  title: { color: colors.textDark, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  hint: { color: colors.textSecondary, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  coordRow: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 4 },
  coordField: { flex: 1, gap: 4 },
  coordLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  coordInput: {
    backgroundColor: 'white', borderWidth: 1, borderColor: colors.borderLight,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13,
    color: colors.textDark, fontFamily: 'monospace',
  },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'white', borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 4,
  },
  gpsBtnText: { color: colors.textDark, fontSize: 12, fontWeight: '600' },
  distText: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic' },
});
