import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { listMyTrips, listProvinces } from '../api/api';
import { colors, FONT, shadow } from '../theme';

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'OPEN', label: 'Lên lịch' },
  { key: 'STARTED', label: 'Đang chạy' },
  { key: 'COMPLETED', label: 'Đã chạy' },
  { key: 'CANCELED', label: 'Đã huỷ' },
];

const STATUS_META = {
  OPEN: { label: 'Lên lịch', bg: '#dbeafe', fg: '#1d4ed8' },
  FULL: { label: 'Lên lịch', bg: '#dbeafe', fg: '#1d4ed8' },
  STARTED: { label: 'Đang chạy', bg: colors.successBg, fg: colors.successDark },
  COMPLETED: { label: 'Đã chạy', bg: '#e5e7eb', fg: '#374151' },
  CANCELED: { label: 'Đã huỷ', bg: colors.dangerBg, fg: colors.dangerText },
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

  const counts = useMemo(() => ({
    ALL: trips.length,
    OPEN: trips.filter((t) => t.status === 'OPEN' || t.status === 'FULL').length,
    STARTED: trips.filter((t) => t.status === 'STARTED').length,
    COMPLETED: trips.filter((t) => t.status === 'COMPLETED').length,
    CANCELED: trips.filter((t) => t.status === 'CANCELED').length,
  }), [trips]);

  const provinceName = (id) => provinces.find((p) => p.id === id)?.name || id || '?';
  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RIDEUP</Text>
          <Text style={styles.title}>Tất cả chuyến xe</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filter, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="clip"
              style={[styles.filterText, filter === f.key && styles.filterTextActive]}
            >
              {f.label}<Text style={styles.filterCount}> {counts[f.key]}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        key={`trips-${filter}`}
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {loading && <Text style={styles.muted}>Đang tải...</Text>}
            {!loading && trips.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>Bạn chưa có chuyến xe nào.</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => navigation.navigate('TripCreate')}
                >
                  <Text style={styles.primaryBtnText}>+ Tạo chuyến mới</Text>
                </TouchableOpacity>
              </View>
            )}
            {!loading && trips.length > 0 && visible.length === 0 && (
              <Text style={styles.emptyBox}>Không có chuyến xe trong nhóm này.</Text>
            )}
          </>
        }
        renderItem={({ item: t }) => {
          const meta = STATUS_META[t.status] || { label: t.status, bg: '#e5e7eb', fg: '#374151' };
          const booked = Math.max(0, (t.seatTotal || 0) - (t.seatAvailable || 0));
          const revenue = (t.priceVnd || 0) * booked;
          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripRoute}>
                    {provinceName(t.startProvinceId)} → {provinceName(t.endProvinceId)}
                  </Text>
                  <Text style={styles.tripTime}>🕐 {fmtTime(t.departureTime)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.metrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Ghế đã đặt</Text>
                  <Text style={styles.metricValue}>{booked}/{t.seatTotal}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Giá vé</Text>
                  <Text style={styles.metricValue}>{fmtMoney(t.priceVnd)}/ghế</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Doanh thu</Text>
                  <Text style={[styles.metricValue, { color: colors.success }]}>{fmtMoney(revenue)}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  kicker: { fontFamily: FONT[800], fontSize: 9, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 1.5 },
  title: { fontFamily: FONT[700], marginTop: 3, fontSize: 20, fontWeight: '700', color: colors.text },
  refreshBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { color: colors.primaryAccent, fontSize: 19, fontWeight: '700' },

  filters: { marginTop: 10, marginBottom: 10, flexGrow: 0 },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  filter: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 30,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1ebe7',
    borderRadius: 14,
    backgroundColor: 'white',
  },
  filterActive: { borderColor: colors.primaryAccent, backgroundColor: colors.primaryLight },
  filterText: { fontFamily: FONT[500], fontSize: 11, lineHeight: 14, color: colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: colors.primaryAccent, fontWeight: '500' },
  filterCount: { fontSize: 10, lineHeight: 13, fontWeight: '500' },

  listContent: { padding: 12, paddingBottom: 24 },
  muted: { color: colors.textSubtle, fontSize: 12 },
  emptyBox: { padding: 38, borderRadius: 10, backgroundColor: 'white', color: colors.textSubtle, fontSize: 12, textAlign: 'center' },

  primaryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6, backgroundColor: colors.primary, alignSelf: 'center' },
  primaryBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },

  card: { marginBottom: 9, padding: 12, borderWidth: 1, borderColor: '#e3ece8', borderRadius: 10, backgroundColor: 'white', ...shadow(2, 0.07, 7) },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  tripRoute: { fontFamily: FONT[700], fontSize: 13, fontWeight: '700', color: colors.textDark },
  tripTime: { fontSize: 12, color: colors.textSubtle, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontFamily: FONT[700], fontSize: 10, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  metrics: { flexDirection: 'row', gap: 24 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, color: colors.textSubtle, marginBottom: 2 },
  metricValue: { fontFamily: FONT[700], fontSize: 12, fontWeight: '700' },
});
