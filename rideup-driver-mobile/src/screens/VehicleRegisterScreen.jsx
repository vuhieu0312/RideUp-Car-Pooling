import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button, Card, HelperText, IconButton, Menu, TextInput,
} from 'react-native-paper';
import { registerVehicle } from '../api/api';

const VEHICLE_TYPES = [
  { value: 'CAR', label: 'Ô tô con (4 chỗ)' },
  { value: 'SUV', label: 'SUV / 7 chỗ' },
  { value: 'VAN', label: 'Van / 16 chỗ' },
];

export default function VehicleRegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    plateNumber: '', vehicleBrand: '', vehicleModel: '',
    vehicleYear: '', vehicleColor: '',
    seatCapacity: 4, vehicleType: 'CAR',
    registrationExpiryDate: '', insuranceExpiryDate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError('');
    if (!/^\d{2,3}[A-Z]?\d{4,5}$/.test(form.plateNumber.toUpperCase().replace(/[-\s]/g, ''))) {
      setError('Biển số không hợp lệ (vd: 29A-12345)'); return;
    }
    setLoading(true);
    try {
      await registerVehicle({
        plateNumber: form.plateNumber.toUpperCase().replace(/[-\s]/g, ''),
        vehicleBrand: form.vehicleBrand || null,
        vehicleModel: form.vehicleModel || null,
        vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : null,
        vehicleColor: form.vehicleColor || null,
        seatCapacity: Number(form.seatCapacity),
        vehicleType: form.vehicleType,
        registrationExpiryDate: form.registrationExpiryDate || null,
        insuranceExpiryDate: form.insuranceExpiryDate || null,
      });
      navigation.navigate('VehicleList');
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký thất bại');
    } finally { setLoading(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="headlineSmall" style={{ fontWeight: '700' }}>🚌 Đăng ký phương tiện</Text>
        <HelperText type="info" visible>Sau khi đăng ký, admin sẽ duyệt. Bạn có thể tạo chuyến sau khi duyệt xong.</HelperText>

        <Card>
          <Card.Content>
            <TextInput mode="outlined" label="Biển số xe *" value={form.plateNumber}
              onChangeText={(v) => set('plateNumber')(v.toUpperCase())}
              placeholder="VD: 29A-12345" style={{ marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput mode="outlined" label="Hãng xe" value={form.vehicleBrand}
                onChangeText={set('vehicleBrand')} placeholder="Toyota" style={{ flex: 1, marginBottom: 8 }} />
              <TextInput mode="outlined" label="Dòng xe" value={form.vehicleModel}
                onChangeText={set('vehicleModel')} placeholder="Vios" style={{ flex: 1, marginBottom: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput mode="outlined" label="Năm SX" value={String(form.vehicleYear)}
                onChangeText={set('vehicleYear')} keyboardType="numeric" style={{ flex: 1, marginBottom: 8 }} />
              <TextInput mode="outlined" label="Màu xe" value={form.vehicleColor}
                onChangeText={set('vehicleColor')} placeholder="Trắng" style={{ flex: 1, marginBottom: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput mode="outlined" label="Số ghế *" value={String(form.seatCapacity)}
                onChangeText={(v) => set('seatCapacity')(Number(v) || 1)}
                keyboardType="numeric" style={{ flex: 1, marginBottom: 8 }} />
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ color: '#6b7280', marginBottom: 4 }}>Loại xe *</Text>
                <Menu visible={menuOpen === 'type'} onDismiss={() => setMenuOpen(null)}
                  anchor={
                    <Button mode="outlined" onPress={() => setMenuOpen('type')} icon="chevron-down"
                      contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
                      {VEHICLE_TYPES.find((t) => t.value === form.vehicleType)?.label}
                    </Button>
                  }
                  style={{ marginTop: 56, width: '90%' }}
                >
                  {VEHICLE_TYPES.map((t) => (
                    <Menu.Item key={t.value} title={t.label} onPress={() => { set('vehicleType')(t.value); setMenuOpen(null); }} />
                  ))}
                </Menu>
              </View>
            </View>
            <TextInput mode="outlined" label="Hạn đăng ký" value={form.registrationExpiryDate}
              onChangeText={set('registrationExpiryDate')} placeholder="2030-12-31" style={{ marginBottom: 8 }} />
            <TextInput mode="outlined" label="Hạn bảo hiểm" value={form.insuranceExpiryDate}
              onChangeText={set('insuranceExpiryDate')} placeholder="2030-12-31" style={{ marginBottom: 8 }} />
          </Card.Content>
        </Card>

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button mode="outlined" onPress={() => navigation.goBack()}>Huỷ</Button>
          <Button mode="contained" onPress={submit} loading={loading} disabled={loading}>Đăng ký xe</Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center' },
});