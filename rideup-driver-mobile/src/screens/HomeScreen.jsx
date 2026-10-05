import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, IconButton, Text } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';
import { listMyTrips, listProvinces } from '../api/api';

export default function HomeScreen({ navigation }) {
  const { user, doLogout } = useAuth();
  const [trips, setTrips] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listMyTrips().catch(() => []), listProvinces().catch(() => [])])
      .then(([t, p]) => { setTrips(t); setProvinces(p); })
      .finally(() => setLoading(false));
  }, []);

  const running = trips.filter((t) => t.status === 'STARTED');
  const scheduled = trips.filter((t) => t.status === 'OPEN' || t.status === 'FULL');
  const provinceName = (id) => provinces.find((p) => p.id === id)?.name || id || '?';
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={styles.brand}>RIDEUP</Text>
            <Text variant="titleMedium">Xin chào, {user?.fullName || 'tài xế'} 👋</Text>
          </View>
          <IconButton icon="logout" onPress={doLogout} iconColor="#fff" />
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Tổng chuyến" value={trips.length} />
          <StatBox label="Đánh giá" value="4.8★" color="#facc15" />
          <StatBox label="Doanh thu" value="120K" />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Button mode="contained" style={{ flex: 1 }} icon="plus"
            onPress={() => navigation.navigate('TripCreate')}>Tạo chuyến mới</Button>
          <Button mode="outlined" style={{ flex: 1 }} icon="view-list"
            onPress={() => navigation.navigate('AllTrips')}>Tất cả chuyến</Button>
        </View>

        <Section title={`Chuyến đang chạy (${running.length})`}>
          {!loading && running.length === 0 ? <Empty text="Không có chuyến đang chạy" /> :
            running.map((t) => (
              <Card key={t.id} style={{ marginBottom: 8 }}>
                <Card.Content>
                  <Text style={{ fontWeight: '700' }}>{provinceName(t.startProvinceId)} → {provinceName(t.endProvinceId)}</Text>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>🕐 {fmtTime(t.departureTime)}</Text>
                </Card.Content>
              </Card>
            ))}
        </Section>

        <Section title={`Chuyến đã lên lịch (${scheduled.length})`}>
          {!loading && scheduled.length === 0 ? <Empty text="Chưa có chuyến nào" /> :
            scheduled.map((t) => (
              <Card key={t.id} style={{ marginBottom: 8 }}>
                <Card.Content>
                  <Text style={{ fontWeight: '700' }}>{provinceName(t.startProvinceId)} → {provinceName(t.endProvinceId)}</Text>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>🕐 {fmtTime(t.departureTime)}</Text>
                  <Text variant="bodySmall">Còn {t.seatAvailable}/{t.seatTotal} ghế</Text>
                </Card.Content>
              </Card>
            ))}
        </Section>

        <Button mode="text" icon="car" onPress={() => navigation.navigate('VehicleList')} style={{ marginTop: 8 }}>
          Phương tiện của tôi
        </Button>
      </ScrollView>

      <BottomNav navigation={navigation} active="Home" />
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Text variant="headlineSmall" style={{ fontWeight: '700', color: color || '#08b85c' }}>{value}</Text>
      <Text variant="bodySmall" style={{ color: '#6b7280' }}>{label}</Text>
    </View>
  );
}

function Empty({ text }) {
  return <Text style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>{text}</Text>;
}

function BottomNav({ navigation, active }) {
  return (
    <View style={styles.bottomNav}>
      <NavItem icon="home" label="Trang chủ" active={active === 'Home'} onPress={() => navigation.navigate('Home')} />
      <NavItem icon="view-list" label="Chuyến" active={active === 'AllTrips'} onPress={() => navigation.navigate('AllTrips')} />
      <NavItem icon="plus-circle" label="Tạo" highlight onPress={() => navigation.navigate('TripCreate')} />
      <NavItem icon="car" label="Xe" active={active === 'VehicleList'} onPress={() => navigation.navigate('VehicleList')} />
    </View>
  );
}

function NavItem({ icon, label, active, highlight, onPress }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <IconButton
        icon={icon}
        size={highlight ? 32 : 22}
        onPress={onPress}
        iconColor={highlight ? '#08b85c' : active ? '#08b85c' : '#6b7280'}
      />
      <Text style={{ fontSize: 11, color: active || highlight ? '#08b85c' : '#6b7280', marginTop: -8 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#08b85c', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  brand: { color: '#fff', letterSpacing: 4, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: -30, paddingHorizontal: 8 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e5e7eb' },
});