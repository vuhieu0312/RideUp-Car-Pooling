import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button, Card, Divider, HelperText, IconButton, Menu, Text, TextInput,
} from 'react-native-paper';
import { listProvinces, listWards, searchTrips } from '../api/api';

export default function TripSearchScreen({ navigation }) {
  const [provinces, setProvinces] = useState([]);
  const [fromProvinceId, setFromProvinceId] = useState('');
  const [toProvinceId, setToProvinceId] = useState('');
  const [startWardId, setStartWardId] = useState('');
  const [endWardId, setEndWardId] = useState('');
  const [startWards, setStartWards] = useState([]);
  const [endWards, setEndWards] = useState([]);
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState('1');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => { listProvinces().then(setProvinces).catch(() => setError('Không tải được danh sách tỉnh')); }, []);
  useEffect(() => {
    setStartWardId('');
    if (fromProvinceId) listWards(fromProvinceId).then(setStartWards).catch(() => setStartWards([]));
    else setStartWards([]);
  }, [fromProvinceId]);
  useEffect(() => {
    setEndWardId('');
    if (toProvinceId) listWards(toProvinceId).then(setEndWards).catch(() => setEndWards([]));
    else setEndWards([]);
  }, [toProvinceId]);

  async function runSearch() {
    if (!fromProvinceId || !startWardId || !toProvinceId || !endWardId || !date) {
      setError('Vui lòng chọn đủ tỉnh, phường/xã và ngày đi');
      return;
    }
    if (fromProvinceId === toProvinceId) {
      setError('Tỉnh đi và tỉnh đến phải khác nhau');
      return;
    }
    setError('');
    setLoading(true);
    setSearched(true);
    try {
      const result = await searchTrips({
        startProvinceId: fromProvinceId,
        startWardId,
        endProvinceId: toProvinceId,
        endWardId,
        departureDate: date,
      });
      setTrips(result);
    } catch (e) {
      setError(e.response?.data?.message || 'Lỗi tìm chuyến');
    } finally {
      setLoading(false);
    }
  }

  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>Tìm chuyến xe ghép</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Picker label="Tỉnh đón *" value={fromProvinceId} options={provinces}
              isOpen={menuOpen === 'fromP'}
              onOpenMenu={() => setMenuOpen('fromP')} onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { setFromProvinceId(id); setMenuOpen(null); }} />
            <Picker label="Khu vực đón *" value={startWardId} options={startWards}
              isOpen={menuOpen === 'fromW'}
              onOpenMenu={() => setMenuOpen('fromW')} onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { setStartWardId(id); setMenuOpen(null); }} />
            <Picker label="Tỉnh trả *" value={toProvinceId} options={provinces}
              isOpen={menuOpen === 'toP'}
              onOpenMenu={() => setMenuOpen('toP')} onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { setToProvinceId(id); setMenuOpen(null); }} />
            <Picker label="Khu vực trả *" value={endWardId} options={endWards}
              isOpen={menuOpen === 'toW'}
              onOpenMenu={() => setMenuOpen('toW')} onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { setEndWardId(id); setMenuOpen(null); }} />

            <TextInput mode="outlined" label="Ngày đi *" value={date}
              onChangeText={setDate} placeholder="2026-12-31" style={{ marginTop: 8 }} />
            <TextInput mode="outlined" label="Số ghế" value={seats}
              onChangeText={setSeats} keyboardType="numeric" style={{ marginTop: 8 }} />

            <Button mode="contained" onPress={runSearch} loading={loading} disabled={loading}
              style={{ marginTop: 12, borderRadius: 12 }} contentStyle={{ paddingVertical: 6 }}>
              Tìm
            </Button>
          </Card.Content>
        </Card>

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        {searched && !loading && trips.length === 0 && (
          <Text style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>
            Không có chuyến nào phù hợp với tiêu chí của bạn.
          </Text>
        )}

        {trips.length > 0 && (
          <Text style={{ marginBottom: 8 }}>Tìm thấy <Text style={{ fontWeight: '700' }}>{trips.length}</Text> chuyến:</Text>
        )}

        {trips.map((t) => (
          <Card key={t.id} style={{ marginBottom: 12 }}>
            <Card.Content>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                    🚌 {t.startProvinceName} → {t.endProvinceName}
                  </Text>
                  <Text variant="bodySmall" style={styles.subtitle}>
                    Tài xế: {t.driverName}{t.driverRating > 0 ? ` · ⭐ ${t.driverRating}` : ''}
                    {t.vehiclePlate ? ` · 🚗 ${t.vehiclePlate}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="titleMedium" style={{ color: '#16a34a', fontWeight: '700' }}>{fmtMoney(t.priceVnd)}</Text>
                  <Text variant="bodySmall" style={styles.subtitle}>/ghế</Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 8 }} />
              <View style={styles.rowGap}>
                <View><Text variant="bodySmall" style={styles.subtitle}>Khởi hành</Text><Text style={{ fontWeight: '600' }}>{fmtTime(t.departureTime)}</Text></View>
                <View><Text variant="bodySmall" style={styles.subtitle}>Còn trống</Text><Text style={{ fontWeight: '600' }}>{t.seatAvailable}/{t.seatTotal} ghế</Text></View>
                <View><Text variant="bodySmall" style={styles.subtitle}>Tổng tiền</Text><Text style={{ fontWeight: '600', color: '#16a34a' }}>{fmtMoney(t.priceVnd * Number(seats))}</Text></View>
              </View>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={() => navigation.navigate('BookingCreate', { trip: t, seats: Number(seats) })}>
                Đặt chỗ
              </Button>
            </Card.Actions>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function Picker({ label, value, options, isOpen, onOpenMenu, onCloseMenu, onSelect }) {
  const selected = options.find((o) => o.id === value);
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="labelSmall" style={{ color: '#6b7280', marginBottom: 4 }}>{label}</Text>
      <Menu
        visible={isOpen} onDismiss={onCloseMenu}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: 24 },
  subtitle: { color: '#6b7280' },
});