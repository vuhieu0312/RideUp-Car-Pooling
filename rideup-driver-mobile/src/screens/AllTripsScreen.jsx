import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, IconButton, Text } from 'react-native-paper';
import { listMyTrips, listProvinces } from '../api/api';

const FILTERS = [
  { key: 'ALL', label: 'Tất cả', color: '#16a34a' },
  { key: 'OPEN', label: 'Lên lịch', color: '#3b82f6' },
  { key: 'STARTED', label: 'Đang chạy', color: '#16a34a' },
  { key: 'COMPLETED', label: 'Đã chạy', color: '#6b7280' },
  { key: 'CANCELED', label: 'Đã hủy', color: '#dc2626' },
];

const STATUS_META = {
  OPEN: { label: 'Lên lịch', color: '#3b82f6' },
  FULL: { label: 'Lên lịch', color: '#3b82f6' },
  STARTED: { label: 'Đang chạy', color: '#16a34a' },
  COMPLETED: { label: 'Đã chạy', color: '#6b7280' },
  CANCELED: { label: 'Đã hủy', color: '#dc2626' },
};

export default function AllTripsScreen({ navigation }) {
  const [trips, setTrips] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([listMyTrips(), listProvinces()])
      .then(([t, p]) => { setTrips(t); setProvinces(p); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    if (filter === 'ALL') return trips;
    if (filter === 'OPEN') return trips.filter((t) => t.status === 'OPEN' || t.status === 'FULL');
    return trips.filter((t) => t.status === filter);
  }, [filter, trips]);

  const provinceName = (id) => provinces.find((p) => p.id === id)?.name || id || '?';
  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ flex: 1, fontWeight: '700' }}>Tất cả chuyến xe</Text>
        <IconButton icon="refresh" onPress={load} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Button mode="contained" icon="plus"
          onPress={() => navigation.navigate('TripCreate')}
          style={{ marginBottom: 12 }}>
          Tạo chuyến mới
        </Button>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} selected={filter === f.key} onPress={() => setFilter(f.key)}
              style={{ marginRight: 8 }} mode="outlined">
              {f.label}
            </Chip>
          ))}
        </ScrollView>

        {loading ? (
          <Text style={{ textAlign: 'center', padding: 24 }}>Đang tải chuyến xe...</Text>
        ) : visible.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ color: '#9ca3af' }}>Chưa có chuyến xe</Text>
          </View>
        ) : (
          visible.map((trip) => {
            const meta = STATUS_META[trip.status] || { label: trip.status, color: '#6b7280' };
            const booked = Math.max(0, (trip.seatTotal || 0) - (trip.seatAvailable || 0));
            const revenue = (trip.priceVnd || 0) * booked;
            return (
              <Card key={trip.id} style={{ marginBottom: 8 }}>
                <Card.Content>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700' }}>{provinceName(trip.startProvinceId)} → {provinceName(trip.endProvinceId)}</Text>
                      <Text variant="bodySmall" style={{ color: '#6b7280' }}>🕐 {trip.departureTime?.replace('T', ' ').substring(0, 16)}</Text>
                    </View>
                    <Chip mode="flat" style={{ backgroundColor: meta.color + '20' }} textStyle={{ color: meta.color }}>
                      {meta.label}
                    </Chip>
                  </View>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View><Text variant="bodySmall" style={{ color: '#6b7280' }}>Ghế đã đặt</Text><Text style={{ fontWeight: '600' }}>{booked}/{trip.seatTotal}</Text></View>
                    <View><Text variant="bodySmall" style={{ color: '#6b7280' }}>Giá vé</Text><Text style={{ fontWeight: '600' }}>{fmtMoney(trip.priceVnd)}/ghế</Text></View>
                    <View><Text variant="bodySmall" style={{ color: '#6b7280' }}>Doanh thu</Text><Text style={{ fontWeight: '600', color: '#16a34a' }}>{fmtMoney(revenue)}</Text></View>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});