import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button, Card, Chip, HelperText, IconButton, Menu, Text, TextInput,
} from 'react-native-paper';
import { createTrip, listMyVehicles, listProvinces, listWards } from '../api/api';

/**
 * Tạo chuyến xe. Cấu trúc form đơn giản hơn web (đã bỏ các custom MobileDatePicker/TimePicker
 * tự viết — dùng TextInput date/time ISO cho mobile).
 */
export default function TripCreateScreen({ navigation }) {
  const [provinces, setProvinces] = useState([]);
  const [pickupWards, setPickupWards] = useState([]);
  const [dropoffWards, setDropoffWards] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(null); // 'fromP' | 'fromW' | 'toP' | 'toW' | 'vehicle'

  const [form, setForm] = useState({
    startProvinceId: '', endProvinceId: '',
    pickupWardIds: [], dropoffWardIds: [],
    departureDate: '', departureTime: '',
    seatTotal: 4, priceVnd: 120000, note: '',
    vehicleId: '',
  });

  useEffect(() => {
    listProvinces().then(setProvinces).catch(() => {});
    listMyVehicles().then(setVehicles).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.startProvinceId) listWards(form.startProvinceId).then(setPickupWards).catch(() => setPickupWards([]));
    else setPickupWards([]);
    setForm((f) => ({ ...f, pickupWardIds: [] }));
  }, [form.startProvinceId]);

  useEffect(() => {
    if (form.endProvinceId) listWards(form.endProvinceId).then(setDropoffWards).catch(() => setDropoffWards([]));
    else setDropoffWards([]);
    setForm((f) => ({ ...f, dropoffWardIds: [] }));
  }, [form.endProvinceId]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  function toggleWard(field, id) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id)
        ? f[field].filter((x) => x !== id)
        : f[field].length >= 4
          ? f[field]
          : [...f[field], id],
    }));
  }

  async function submit() {
    setError('');
    if (!form.startProvinceId || !form.endProvinceId) { setError('Chọn tỉnh đón và trả'); return; }
    if (form.startProvinceId === form.endProvinceId) { setError('Tỉnh đón và trả phải khác'); return; }
    if (form.pickupWardIds.length === 0 || form.dropoffWardIds.length === 0) { setError('Chọn ít nhất 1 điểm đón và 1 điểm trả'); return; }
    if (!form.departureDate || !form.departureTime) { setError('Chọn ngày giờ khởi hành'); return; }
    if (!form.vehicleId) { setError('Chọn xe'); return; }

    setLoading(true);
    try {
      const stops = [
        ...form.pickupWardIds.map((id) => ({ stopType: 'PICKUP', wardId: id })),
        ...form.dropoffWardIds.map((id) => ({ stopType: 'DROPOFF', wardId: id })),
      ];
      await createTrip({
        startProvinceId: form.startProvinceId,
        endProvinceId: form.endProvinceId,
        stops,
        departureTime: `${form.departureDate}T${form.departureTime}:00`,
        seatTotal: Number(form.seatTotal),
        priceVnd: Number(form.priceVnd),
        note: form.note || null,
      });
      navigation.navigate('Home');
    } catch (e) {
      setError(e.response?.data?.message || 'Tạo chuyến thất bại');
    } finally { setLoading(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>Tạo chuyến xe</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <SectionTitle title="1. Tuyến đường" />
            <Picker label="Tỉnh đón *" value={form.startProvinceId} options={provinces}
              isOpen={menuOpen === 'fromP'} onOpenMenu={() => setMenuOpen('fromP')} onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { set('startProvinceId')(id); setMenuOpen(null); }} />
            <WardChips label="Khu vực đón *" wards={pickupWards} selectedIds={form.pickupWardIds}
              onToggle={(id) => toggleWard('pickupWardIds', id)} />
            <Picker label="Tỉnh trả *" value={form.endProvinceId} options={provinces}
              isOpen={menuOpen === 'toP'} onOpenMenu={() => setMenuOpen('toP')} onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { set('endProvinceId')(id); setMenuOpen(null); }} />
            <WardChips label="Khu vực trả *" wards={dropoffWards} selectedIds={form.dropoffWardIds}
              onToggle={(id) => toggleWard('dropoffWardIds', id)} />
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <SectionTitle title="2. Lịch khởi hành" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput mode="outlined" label="Ngày *" placeholder="2026-12-31"
                value={form.departureDate} onChangeText={set('departureDate')} style={{ flex: 1 }} />
              <TextInput mode="outlined" label="Giờ *" placeholder="08:00"
                value={form.departureTime} onChangeText={set('departureTime')} style={{ flex: 1 }} />
            </View>
            <TextInput mode="outlined" label="Số ghế *" value={String(form.seatTotal)}
              onChangeText={(v) => set('seatTotal')(Number(v) || 1)}
              keyboardType="numeric" style={{ marginTop: 8 }} />
            <TextInput mode="outlined" label="Giá vé (VND) *" value={String(form.priceVnd)}
              onChangeText={(v) => set('priceVnd')(Number(v) || 0)}
              keyboardType="numeric" style={{ marginTop: 8 }} />
            <TextInput mode="outlined" label="Ghi chú" value={form.note} onChangeText={set('note')}
              multiline numberOfLines={2} style={{ marginTop: 8 }} />
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <SectionTitle title="3. Chọn xe" />
            {vehicles.length === 0 ? (
              <HelperText type="Vui" visible>Bạn chưa có xe. Vào "Phương tiện của tôi" để đăng ký.</HelperText>
            ) : (
              <Picker label="Xe *" value={form.vehicleId}
                options={vehicles.map((v) => ({ id: v.id, name: `${v.plateNumber} · ${v.vehicleType} · ${v.seatCapacity} chỗ` }))}
                isOpen={menuOpen === 'vehicle'} onOpenMenu={() => setMenuOpen('vehicle')} onCloseMenu={() => setMenuOpen(null)}
                onSelect={(id) => { set('vehicleId')(id); setMenuOpen(null); }} />
            )}
          </Card.Content>
        </Card>

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <Button mode="contained" onPress={submit} loading={loading} disabled={loading}
          style={{ marginTop: 16, borderRadius: 12 }} contentStyle={{ paddingVertical: 6 }}>
          Tạo chuyến xe
        </Button>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title }) {
  return <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8 }}>{title}</Text>;
}

function Picker({ label, value, options, isOpen, onOpenMenu, onCloseMenu, onSelect }) {
  const selected = options.find((o) => o.id === value);
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="labelSmall" style={{ color: '#6b7280', marginBottom: 4 }}>{label}</Text>
      <Menu visible={isOpen} onDismiss={onCloseMenu}
        anchor={
          <Button mode="outlined" onPress={onOpenMenu} icon="chevron-down"
            contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
            {selected?.name || 'Chọn...'}
          </Button>
        }
        style={{ marginTop: 56, width: '90%' }}
      >
        {options.length === 0 ? (
          <Menu.Item title="Không có dữ liệu" disabled />
        ) : options.map((opt) => (
          <Menu.Item key={opt.id} title={opt.name} onPress={() => onSelect(opt.id)} />
        ))}
      </Menu>
    </View>
  );
}

function WardChips({ label, wards, selectedIds, onToggle }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="labelSmall" style={{ color: '#6b7280', marginBottom: 4 }}>{label} ({selectedIds.length}/4)</Text>
      {wards.length === 0 ? (
        <Text style={{ color: '#9ca3af', fontStyle: 'italic' }}>Vui lòng chọn tỉnh trước</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {wards.slice(0, 8).map((w) => (
            <Chip key={w.id} selected={selectedIds.includes(w.id)} onPress={() => onToggle(w.id)} compact>
              {w.name}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center' },
});