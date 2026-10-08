import { useEffect, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';
import { listMyTrips, listProvinces } from '../api/api';
import { colors, FONT, HERO_IMAGE, shadow, typography } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.hero} imageStyle={{ resizeMode: 'cover' }}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.brand}>RIDEUP</Text>
              <Text style={styles.greeting}>Xin chào, {user?.fullName || 'tài xế'} <Text style={styles.greetingEmoji}>👋</Text></Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('AccountTab', { screen: 'Account' })}
              accessibilityLabel="Mở tài khoản"
            >
              {renderHeroAvatar(user)}
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>Sẵn sàng chở khách?</Text>
          <Text style={styles.heroSubtitle}>Tạo chuyến nhanh — đón khách dọc đường</Text>
          <LinearGradient pointerEvents="none" colors={['rgba(247,250,249,0)', colors.bg]} style={styles.heroFade} />
        </ImageBackground>

        <View style={styles.statsRow}>
          <Stat icon="car-outline" value={trips.length} label="Tổng chuyến" />
          <Stat icon="star-outline" value="4.8" label="Đánh giá" accent />
          <Stat icon="cash-multiple" value="120K" label="Doanh thu" />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('TripCreate')}>
            <MaterialCommunityIcons name="plus" size={17} color="#fff" />
            <Text style={styles.createButtonText}>Tạo chuyến mới</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.allButton} onPress={() => navigation.navigate('AllTripsTab')}>
            <MaterialCommunityIcons name="format-list-bulleted" size={16} color={colors.primaryAccent} />
            <Text style={styles.allButtonText}>Tất cả chuyến</Text>
          </TouchableOpacity>
        </View>

        <Section title={`Chuyến đang thực hiện (${running.length})`}>
          {!loading && running.length === 0 ? <TripEmpty text="Không có chuyến đang chạy" /> :
            running.map((trip) => <TripCard key={trip.id} trip={trip} fmtTime={fmtTime} provinceName={provinceName} running />)}
        </Section>

        <Section title={`Chuyến đã lên lịch (${scheduled.length})`}>
          {!loading && scheduled.length === 0 ? <TripEmpty text="Chưa có chuyến nào" /> :
            scheduled.map((trip) => <TripCard key={trip.id} trip={trip} fmtTime={fmtTime} provinceName={provinceName} />)}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ icon, value, label, accent }) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon} size={14} color={accent ? '#f2a900' : colors.primaryAccent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TripEmpty({ text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function TripCard({ trip, fmtTime, provinceName, running }) {
  const booked = (trip.seatTotal || 0) - (trip.seatAvailable || 0);
  return (
    <View style={[styles.tripCard, running && styles.runningCard]}>
      <View style={styles.tripTop}>
        <Text style={styles.tripStatus}>{running ? 'Đang chạy' : 'Đã lên lịch'}</Text>
        <Text style={styles.seatCount}>{booked}/{trip.seatTotal || 0} ghế</Text>
      </View>
      <View style={styles.route}>
        <MaterialCommunityIcons name="map-marker" size={15} color={colors.primary} />
        <Text style={styles.routeText}>{provinceName(trip.startProvinceId)}</Text>
        <MaterialCommunityIcons name="arrow-right" size={15} color={colors.primary} />
        <Text style={styles.routeText}>{provinceName(trip.endProvinceId)}</Text>
      </View>
      <View style={styles.timeRow}>
        <MaterialCommunityIcons name="clock-outline" size={14} color="#84958f" />
        <Text style={styles.tripTime}>{fmtTime(trip.departureTime)}</Text>
      </View>
      {running ? (
        <TouchableOpacity style={styles.detailButton}>
          <Text style={styles.detailButtonText}>Xem chi tiết</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.tripFooter}>
          <View style={styles.passengerRow}>
            <MaterialCommunityIcons name="account-group-outline" size={14} color="#527067" />
            <Text style={styles.passengers}>{booked} hành khách</Text>
          </View>
          <Text style={[styles.revenue, booked === 0 && styles.emptyRevenue]}>{booked > 0 ? `${new Intl.NumberFormat('vi-VN').format(trip.priceVnd * booked)}đ` : '0đ'}</Text>
        </View>
      )}
    </View>
  );
}

/** Avatar nhỏ ở góc phải header — ưu tiên ảnh từ user.avatarUrl, fallback initials. */
function renderHeroAvatar(user) {
  const initials = (user?.fullName || user?.email || 'U')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const url = user?.avatarUrl
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `http://localhost:8080${user.avatarUrl}`)
    : null;
  return (
    <View style={styles.heroAvatarWrap}>
      {url ? (
        <Avatar.Image size={36} source={{ uri: url }} />
      ) : (
        <Avatar.Text
          size={36}
          label={initials}
          style={{ backgroundColor: colors.primaryAccent }}
          labelStyle={{ fontSize: 12, fontWeight: '700' }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 76 },
  hero: { minHeight: 240, padding: 18, paddingBottom: 36, justifyContent: 'flex-start', overflow: 'hidden' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.heroOverlay },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontFamily: FONT[800], fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 2 },
  greeting: { fontFamily: FONT[600], marginTop: 8, fontSize: 14, fontWeight: '600', color: colors.textOnPrimary },
  greetingEmoji: { fontSize: 16 },
  heroTitle: { fontFamily: FONT[700], marginTop: 28, fontSize: 25, fontWeight: '700', color: 'white', lineHeight: 28 },
  heroSubtitle: { fontFamily: FONT[400], marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.82)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 82 },
  logout: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroAvatarWrap: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', marginHorizontal: 14, marginTop: -26, marginBottom: 16, gap: 7, zIndex: 2 },
  statBox: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 9, ...shadow(2, 0.1, 8) },
  statValue: { fontFamily: FONT[700], fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 2 },
  statLabel: { marginTop: 2, fontSize: 9, color: colors.textMuted },

  actions: { flexDirection: 'row', gap: 8, padding: 20, paddingBottom: 0 },
  createButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 22, backgroundColor: colors.primary },
  createButtonText: { fontFamily: FONT[600], color: '#fff', fontSize: 13, fontWeight: '600' },
  allButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: '#9aa9a4', borderRadius: 22, backgroundColor: 'transparent' },
  allButtonText: { fontFamily: FONT[600], color: colors.primaryAccent, fontSize: 13, fontWeight: '600' },
  section: { marginTop: 20, marginHorizontal: 16 },
  sectionTitle: { ...typography.section, marginBottom: 12, color: colors.textDark },
  tripCard: { marginBottom: 9, padding: 12, borderWidth: 1, borderColor: '#dfece6', borderRadius: 10, backgroundColor: '#fff', ...shadow(2, 0.07, 7) },
  runningCard: { borderColor: '#a7dfc0', backgroundColor: '#fbfffd' },
  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tripStatus: { fontFamily: FONT[700], paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#eaf9f1', color: '#078d50', fontSize: 10, fontWeight: '700' },
  seatCount: { color: '#6b7280', fontSize: 12 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { ...typography.bodyStrong, color: '#26473e' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  tripTime: { ...typography.label, color: '#84958f' },
  detailButton: { alignItems: 'center', marginTop: 10, padding: 8, borderRadius: 6, backgroundColor: '#16a34a' },
  detailButtonText: { color: '#fff', fontWeight: '600' },
  tripFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  passengers: { ...typography.label, color: '#527067' },
  revenue: { ...typography.bodyStrong, color: '#16a34a' },
  emptyRevenue: { color: '#9ca3af' },
  empty: { alignItems: 'center', padding: 20, borderRadius: 8, backgroundColor: '#fff' },
  emptyText: { ...typography.body, color: '#9ca3af' },
});