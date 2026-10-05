import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button, Card, Chip, Divider, HelperText, IconButton, Menu, Text, TextInput,
} from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';
import { listProvinces, listWards, searchTrips } from '../api/api';

export default function HomeScreen({ navigation }) {
  const { user, doLogout } = useAuth();
  const [provinces, setProvinces] = useState([]);
  const [pickupWards, setPickupWards] = useState([]);
  const [dropoffWards, setDropoffWards] = useState([]);
  const [fromProvinceId, setFromProvinceId] = useState('');
  const [toProvinceId, setToProvinceId] = useState('');
  const [pickupWardId, setPickupWardId] = useState('');
  const [dropoffWardId, setDropoffWardId] = useState('');
  const [date, setDate] = useState('');
  const [searchError, setSearchError] = useState('');
  const [trips, setTrips] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null); // 'from' | 'to' | 'pickup' | 'dropoff' | null

  useEffect(() => { listProvinces().then(setProvinces).catch(() => {}); }, []);
  useEffect(() => {
    setPickupWardId('');
    if (fromProvinceId) listWards(fromProvinceId).then(setPickupWards).catch(() => setPickupWards([]));
    else setPickupWards([]);
  }, [fromProvinceId]);
  useEffect(() => {
    setDropoffWardId('');
    if (toProvinceId) listWards(toProvinceId).then(setDropoffWards).catch(() => setDropoffWards([]));
    else setDropoffWards([]);
  }, [toProvinceId]);

  async function runSearch() {
    if (!fromProvinceId || !toProvinceId || !pickupWardId || !dropoffWardId || !date) {
      setSearchError('Vui lòng chọn đủ tỉnh, phường/xã và ngày khởi hành');
      return;
    }
    if (fromProvinceId === toProvinceId) {
      setSearchError('Tỉnh đón và tỉnh trả phải khác nhau');
      return;
    }
    setSearchError('');
    setSearching(true);
    setSearched(true);
    try {
      const result = await searchTrips({
        startProvinceId: fromProvinceId,
        startWardId: pickupWardId,
        endProvinceId: toProvinceId,
        endWardId: dropoffWardId,
        departureDate: date,
      });
      setTrips(result);
    } catch (e) {
      setTrips([]);
      setSearchError(e.response?.data?.message || 'Không tìm được chuyến phù hợp');
    } finally {
      setSearching(false);
    }
  }

  const provinceName = (id) => provinces.find((p) => p.id === id)?.name || id || '?';
  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (v) => (v ? v.replace('T', ' ').slice(0, 16) : '--');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={styles.brand}>RIDEUP</Text>
            <Text variant="titleMedium">Xin chào, {user?.fullName || 'bạn'} 👋</Text>
          </View>
          <IconButton icon="logout" onPress={doLogout} />
        </View>

        <Text variant="headlineMedium" style={styles.headline}>Bạn muốn đi đâu?</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Đặt nhanh, giá rõ ràng, tài xế đã xác minh.
        </Text>

        {/* Search panel */}
        <Card style={styles.searchCard}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>Tìm chuyến ghép</Text>
            <Text variant="bodySmall" style={styles.subtitle}>Chọn điểm đón/trả chi tiết</Text>

            <Picker
              label="TỈNH ĐÓN"
              value={fromProvinceId}
              options={provinces}
              isOpen={menuOpen === 'from'}
              onOpenMenu={() => setMenuOpen('from')}
              onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { setFromProvinceId(id); setMenuOpen(null); }}
            />
            <Picker
              label="KHU VỰC ĐÓN"
              value={pickupWardId}
              options={pickupWards}
              isOpen={menuOpen === 'pickup'}
              onOpenMenu={() => setMenuOpen('pickup')}
              onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { setPickupWardId(id); setMenuOpen(null); }}
            />
            <Picker
              label="TỈNH TRẢ"
              value={toProvinceId}
              options={provinces}
              isOpen={menuOpen === 'to'}
              onOpenMenu={() => setMenuOpen('to')}
              onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { setToProvinceId(id); setMenuOpen(null); }}
            />
            <Picker
              label="KHU VỰC TRẢ"
              value={dropoffWardId}
              options={dropoffWards}
              isOpen={menuOpen === 'dropoff'}
              onOpenMenu={() => setMenuOpen('dropoff')}
              onCloseMenu={() => setMenuOpen(null)}
              onSelect={(id) => { setDropoffWardId(id); setMenuOpen(null); }}
            />

            <TextInput
              mode="outlined" label="Ngày khởi hành (YYYY-MM-DD)"
              value={date} onChangeText={setDate}
              placeholder="2026-12-31"
              style={{ marginTop: 8 }}
            />

            {!!searchError && <HelperText type="error" visible>{searchError}</HelperText>}

            <Button mode="contained" onPress={runSearch} loading={searching} disabled={searching}
              style={{ marginTop: 12, borderRadius: 12 }} contentStyle={{ paddingVertical: 6 }}>
              Tìm chuyến ngay
            </Button>
          </Card.Content>
        </Card>

        {/* Trip results */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.rowBetween}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>Chuyến xe đang mở</Text>
            <Button compact onPress={() => setTrips([])}>Làm mới</Button>
          </View>

          {searched && trips.length > 0 && trips.map((trip) => (
            <Card key={trip.id} style={styles.tripCard}>
              <Card.Content>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                      {provinceName(trip.startProvinceId)} → {provinceName(trip.endProvinceId)}
                    </Text>
                    <Text variant="bodySmall" style={styles.subtitle}>🕐 {fmtTime(trip.departureTime)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="titleMedium" style={{ color: '#16a34a', fontWeight: '700' }}>
                      {fmtMoney(trip.priceVnd)}
                    </Text>
                    <Text variant="bodySmall" style={styles.subtitle}>/ghế</Text>
                  </View>
                </View>
                <Divider style={{ marginVertical: 8 }} />
                <Text variant="bodySmall">👤 {trip.driverName || 'Tài xế RideUp'}</Text>
                <Text variant="bodySmall">Còn {trip.seatAvailable}/{trip.seatTotal} ghế</Text>
              </Card.Content>
              <Card.Actions>
                <Button mode="contained"
                  onPress={() => navigation.navigate('BookingCreate', { trip, pickupWardId, dropoffWardId })}>
                  Đặt chỗ
                </Button>
              </Card.Actions>
            </Card>
          ))}

          {searched && trips.length === 0 && (
            <Card style={styles.tripCard}><Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>Không có chuyến phù hợp</Text>
              <Text variant="bodySmall" style={styles.subtitle}>Thử đổi ngày hoặc điểm đi/đến.</Text>
            </Card.Content></Card>
          )}

          {!searched && (
            <Card style={styles.tripCard}><Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>Chưa có chuyến xe đang mở</Text>
              <Text variant="bodySmall" style={styles.subtitle}>Hãy chọn điểm đi và điểm đến để tìm chuyến.</Text>
            </Card.Content></Card>
          )}
        </View>
      </ScrollView>

      <Divider />
      <View style={styles.bottomNav}>
        <Chip icon="home" mode="flat" selected>Trang chủ</Chip>
        <Chip icon="car" onPress={() => navigation.navigate('MyBookings')}>Chuyến xe</Chip>
        <Chip icon="message">Tin nhắn</Chip>
        <Chip icon="bell">Thông báo</Chip>
      </View>
    </View>
  );
}

/** Picker dùng Menu của Paper — thay thế cho <select> + dropdown tự viết của web. */
function Picker({ label, value, options, isOpen, onOpenMenu, onCloseMenu, onSelect }) {
  const selected = options.find((o) => o.id === value);
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="labelSmall" style={{ color: '#6b7280', marginBottom: 4 }}>{label}</Text>
      <Menu
        visible={isOpen}
        onDismiss={onCloseMenu}
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
          <Menu.Item key={opt.id} title={opt.name}
            onPress={() => onSelect(opt.id)} />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  brand: { color: '#10b981', letterSpacing: 4, fontWeight: '700' },
  headline: { fontWeight: '700' },
  subtitle: { color: '#6b7280' },
  searchCard: { marginTop: 16 },
  tripCard: { marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, backgroundColor: '#fff' },
});