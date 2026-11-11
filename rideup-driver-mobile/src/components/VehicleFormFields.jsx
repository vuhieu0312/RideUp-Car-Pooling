import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, TextInput } from 'react-native-paper';
import { colors, FONT } from '../theme';
import { seatsForType, VEHICLE_TYPES } from '../utils/driverForm';
import DateField from './DateField';
import ImagePickField from './ImagePickField';
import { Text } from './Typography';

export default function VehicleFormFields({ form, setField, files, setFile, existing }) {
  function changeType(value) {
    setField('vehicleType', value);
    const seats = seatsForType(value);
    if (seats) setField('seatCapacity', seats);
  }

  return (
    <View>
      <TextInput
        mode="outlined"
        label="Biển số xe *"
        value={form.plateNumber}
        onChangeText={(v) => setField('plateNumber', v.toUpperCase())}
        autoCapitalize="characters"
        placeholder="VD: 29A-12345"
        style={styles.input}
      />

      <Text style={styles.label}>Loại xe *</Text>
      <SegmentedButtons
        value={form.vehicleType}
        onValueChange={changeType}
        buttons={VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.short }))}
        style={styles.input}
        theme={{ colors: { secondaryContainer: colors.primaryFaintest, onSecondaryContainer: colors.primaryAccent } }}
      />

      <TextInput
        mode="outlined"
        label="Số chỗ ngồi *"
        keyboardType="numeric"
        maxLength={2}
        value={String(form.seatCapacity)}
        onChangeText={(v) => setField('seatCapacity', v)}
        style={styles.input}
      />
      <View style={styles.row}>
        <TextInput mode="outlined" label="Hãng xe" placeholder="Toyota" value={form.vehicleBrand}
          onChangeText={(v) => setField('vehicleBrand', v)} style={[styles.input, styles.flex]} />
        <TextInput mode="outlined" label="Dòng xe" placeholder="Vios" value={form.vehicleModel}
          onChangeText={(v) => setField('vehicleModel', v)} style={[styles.input, styles.flex]} />
      </View>
      <View style={styles.row}>
        <TextInput mode="outlined" label="Năm sản xuất" keyboardType="numeric" maxLength={4} value={form.vehicleYear}
          onChangeText={(v) => setField('vehicleYear', v)} style={[styles.input, styles.flex]} />
        <TextInput mode="outlined" label="Màu xe" placeholder="Trắng" value={form.vehicleColor}
          onChangeText={(v) => setField('vehicleColor', v)} style={[styles.input, styles.flex]} />
      </View>

      <Text style={styles.label}>Hạn đăng kiểm</Text>
      <DateField
        value={form.registrationExpiryDate}
        onChange={(v) => setField('registrationExpiryDate', v)}
        placeholder="Chọn ngày (không bắt buộc)"
      />

      <View style={styles.images}>
        <ImagePickField
          label={existing?.vehicleImage ? 'Ảnh xe' : 'Ảnh xe *'}
          file={files.vehicleImage}
          existingPath={existing?.vehicleImage}
          onChange={(f) => setFile('vehicleImage', f)}
        />
        <ImagePickField
          label={existing?.registrationImage ? 'Ảnh giấy đăng ký xe (cà vẹt)' : 'Ảnh giấy đăng ký xe (cà vẹt) *'}
          file={files.registrationImage}
          existingPath={existing?.registrationImage}
          onChange={(f) => setFile('registrationImage', f)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 10 },
  label: { fontFamily: FONT[600], fontWeight: '600', fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  images: { marginTop: 14 },
});
