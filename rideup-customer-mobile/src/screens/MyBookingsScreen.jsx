import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { cancelBooking, listMyBookings } from '../api/api';
import { colors, shadow } from '../theme';

const STATUS_META = {
  PENDING: { label: '⏳ Chờ tài xế duyệt', bg: colors.pendingBg, fg: '#92400e' },
  CONFIRMED: { label: '✅ Đã xác nhận', bg: colors.successBg, fg: colors.successDark },
  COMPLETED: { label: '✔️ Hoàn thành', bg: colors.successBg, fg: colors.successDark },
  CANCELLED_USER: { label: '✖️ Đã huỷ', bg: colors.dangerBg, fg: colors.dangerText },
  CANCELLED_PAYMENT_FAILED: { label: '✖️ Huỷ (thanh toán lỗi)', bg: colors.dangerBg, fg: colors.dangerText },
  EXPIRED: { label: '⌛ Hết hạn', bg: colors.dangerBg, fg: colors.dangerText },
};

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang đặt' },
  { key: 'COMPLETED', label: 'Đã xong' },
  { key: 'CANCELED', label: 'Đã hủy' },
];

export default function MyBookingsScreen({ navigation }) {
  const { doLogout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [actionMsg, setActionMsg] = useState('');

  function load() {
    setLoading(true);
    listMyBookings()
      .then(setBookings)
      .catch(() => setActionMsg('Lỗi tải booking'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // ScrollView dọc cũ tự "clamp" scroll position khi content ngắn đi → cảm giác màn dịch xuống.
  // FlatList + `key={filter}` ép remount với filter mới → scroll bắt đầu từ 0, không có transition.

  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  function matchesFilter(b) {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return b.status === 'PENDING' || b.status === 'CONFIRMED';
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    return ['CANCELLED_USER', 'CANCELLED_PAYMENT_FAILED', 'EXPIRED'].includes(b.status);
  }

  const visible = bookings.filter(matchesFilter);
  const counts = {
    ALL: bookings.length,
    ACTIVE: bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED').length,
    COMPLETED: bookings.filter((b) => b.status === 'COMPLETED').length,
    CANCELED: bookings.filter((b) => ['CANCELLED_USER', 'CANCELLED_PAYMENT_FAILED', 'EXPIRED'].includes(b.status)).length,
  };

  async function doCancel(b) {
    if (b.status !== 'PENDING' && b.status !== 'CONFIRMED') return;
    try {
      await cancelBooking(b.id, 'Khách hủy từ app');
      setActionMsg('✅ Đã huỷ booking');
      load();
    } catch (e) {
      setActionMsg(`❌ ${e.response?.data?.message || 'Lỗi huỷ'}`);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RIDEUP</Text>
          <Text style={styles.title}>Chuyến xe của tôi</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
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
        key={`bookings-${filter}`}
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {!!actionMsg && <Text style={styles.actionMsg}>{actionMsg}</Text>}
            {loading && <Text style={styles.muted}>Đang tải...</Text>}
            {!loading && bookings.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>Bạn chưa có booking nào.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('HomeTab')}>
                  <Text style={styles.primaryBtnText}>Tìm chuyến ngay</Text>
                </TouchableOpacity>
              </View>
            )}
            {!loading && bookings.length > 0 && visible.length === 0 && (
              <Text style={styles.emptyBox}>Không có chuyến xe trong nhóm này.</Text>
            )}
          </>
        }
        renderItem={({ item: b }) => {
          const meta = STATUS_META[b.status] || { label: b.status, bg: colors.pendingBg, fg: '#92400e' };
          const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED';
          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>Mã: <Text style={{ fontWeight: '700' }}>{b.bookingCode}</Text></Text>
                  <Text style={styles.tripTime}>🚌 Khởi hành: {fmtTime(b.tripDeparture)}</Text>
                  {!!b.tripPlate && <Text style={styles.muted}>Xe: {b.tripPlate}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.metrics}>
                <View style={styles.metric}><Text style={styles.metricLabel}>Số ghế</Text><Text style={styles.metricValue}>{b.seatCount}</Text></View>
                <View style={styles.metric}><Text style={styles.metricLabel}>Tổng tiền</Text><Text style={[styles.metricValue, { color: colors.success }]}>{fmtMoney(b.totalAmount)}}</Text></View>
                <View style={styles.metric}><Text style={styles.metricLabel}>Thanh toán</Text><Text style={styles.metricValue}>{b.paymentStatus}</Text></View>
              </View>

              {!!b.cancelReason && (
                <Text style={styles.cancelReason}>Lý do: {b.cancelReason}</Text>
              )}

              {canCancel && (
                <TouchableOpacity style={styles.dangerBtn} onPress={() => doCancel(b)}>
                  <Text style={styles.dangerBtnText}>Huỷ booking</Text>
                </TouchableOpacity>
              )}
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
  kicker: { fontSize: 9, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 1.5 },
  title: { marginTop: 3, fontSize: 20, fontWeight: '700', color: colors.text },
  refreshBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { color: colors.primaryAccent, fontSize: 19, fontWeight: '700' },

  filters: { marginTop: 10, marginBottom: 10, flexGrow: 0 },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,         // tạo khoảng thở cho border-radius, không bị clip ở mép ScrollView
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
    overflow: 'visible',       // đảm bảo border không bị parent clip
  },
  filterActive: { borderColor: colors.primaryAccent, backgroundColor: colors.primaryLight },
  filterText: { fontSize: 11, lineHeight: 14, color: colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: colors.primaryAccent, fontWeight: '500' },  // không bold — giữ size chữ đồng đều
  filterCount: { fontSize: 10, lineHeight: 13, fontWeight: '500' },

  actionMsg: { padding: 9, backgroundColor: colors.primaryFaintest, borderRadius: 6, marginBottom: 10, fontSize: 11, color: colors.textDark },
  listContent: { padding: 12, paddingBottom: 24 },
  muted: { color: colors.textSubtle, fontSize: 12 },
  emptyBox: { padding: 38, borderRadius: 10, backgroundColor: 'white', color: colors.textSubtle, fontSize: 12, textAlign: 'center' },

  card: { marginBottom: 9, padding: 12, borderWidth: 1, borderColor: '#e3ece8', borderRadius: 10, backgroundColor: 'white', ...shadow(2, 0.07, 7) },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  code: { fontSize: 10, color: colors.textSubtle, marginBottom: 4 },
  tripTime: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  metrics: { flexDirection: 'row', gap: 24 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, color: colors.textSubtle, marginBottom: 2 },
  metricValue: { fontSize: 12, fontWeight: '700' },
  cancelReason: { marginTop: 8, fontSize: 11, color: colors.dangerText },

  dangerBtn: { marginTop: 12, alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca' },
  dangerBtnText: { color: colors.danger, fontSize: 11, fontWeight: '700' },

  primaryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6, backgroundColor: colors.primary, alignSelf: 'center' },
  primaryBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
});