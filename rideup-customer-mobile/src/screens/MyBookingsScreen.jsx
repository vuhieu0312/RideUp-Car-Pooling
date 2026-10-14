import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { cancelBooking, listMyBookings } from '../api/api';
import { usePayment } from '../hooks/usePayment';
import { colors, shadow } from '../theme';
import { Text } from '../components/Typography';

const STATUS_META = {
  PENDING_PAYMENT: { icon: 'credit-card-outline', label: 'Chờ thanh toán', bg: colors.pendingBg, fg: '#92400e' },
  WAITING_DRIVER_APPROVAL: { icon: 'clock-outline', label: 'Chờ tài xế duyệt', bg: colors.pendingBg, fg: '#92400e' },
  CONFIRMED: { icon: 'check-circle-outline', label: 'Đã xác nhận', bg: colors.successBg, fg: colors.successDark },
  COMPLETED: { icon: 'check-all', label: 'Hoàn thành', bg: colors.successBg, fg: colors.successDark },
  REJECTED_BY_DRIVER: { icon: 'close-circle-outline', label: 'Tài xế từ chối', bg: colors.dangerBg, fg: colors.dangerText },
  CANCELLED_BY_USER: { icon: 'close-circle-outline', label: 'Bạn đã huỷ', bg: colors.dangerBg, fg: colors.dangerText },
  CANCELLED_BY_DRIVER: { icon: 'close-circle-outline', label: 'Tài xế huỷ chuyến', bg: colors.dangerBg, fg: colors.dangerText },
  CANCELLED_PAYMENT_FAILED: { icon: 'alert-circle-outline', label: 'Huỷ (thanh toán lỗi)', bg: colors.dangerBg, fg: colors.dangerText },
  EXPIRED: { icon: 'timer-sand', label: 'Hết hạn', bg: colors.dangerBg, fg: colors.dangerText },
};

const PAYMENT_STATUS_META = {
  PENDING: { icon: 'clock-outline', label: 'Chờ thanh toán', fg: '#92400e' },
  HOLDING: { icon: 'lock-outline', label: 'Đã đặt cọc', fg: '#15803d' },
  PAID: { icon: 'check-circle-outline', label: 'Đã thanh toán', fg: '#15803d' },
  FAILED: { icon: 'alert-circle-outline', label: 'Thanh toán lỗi', fg: colors.dangerText },
  VOIDED: { icon: 'minus-circle-outline', label: 'Đã huỷ thanh toán', fg: colors.textSubtle },
  REFUNDED: { icon: 'undo-variant', label: 'Đã hoàn tiền', fg: colors.textSubtle },
};

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang đặt' },
  { key: 'COMPLETED', label: 'Đã xong' },
  { key: 'CANCELED', label: 'Đã hủy' },
];

export default function MyBookingsScreen({ navigation }) {
  const { doLogout } = useAuth();
  const insets = useSafeAreaInsets();
  const { pay: payWithStripe, loading: payLoading } = usePayment();
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

  // Refetch mỗi khi screen focus (lần đầu vào tab, và khi quay lại từ Stripe / màn đặt chỗ).
  // Rời tab thì xoá banner thông báo — tab navigator giữ screen mounted nên state không tự reset.
  useFocusEffect(useCallback(() => {
    load();
    return () => setActionMsg('');
  }, []));

  // Banner tự tắt sau 3 giây (trước đây không bao giờ biến mất)
  useEffect(() => {
    if (!actionMsg) return undefined;
    const t = setTimeout(() => setActionMsg(''), 3000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  // ScrollView dọc cũ tự "clamp" scroll position khi content ngắn đi → cảm giác màn dịch xuống.
  // FlatList + `key={filter}` ép remount với filter mới → scroll bắt đầu từ 0, không có transition.

  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  function matchesFilter(b) {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return [
      'PENDING_PAYMENT', 'WAITING_DRIVER_APPROVAL', 'CONFIRMED',
    ].includes(b.status);
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    return [
      'REJECTED_BY_DRIVER', 'CANCELLED_BY_USER', 'CANCELLED_BY_DRIVER',
      'CANCELLED_PAYMENT_FAILED', 'EXPIRED',
    ].includes(b.status);
  }

  const visible = bookings.filter(matchesFilter);
  const counts = {
    ALL: bookings.length,
    ACTIVE: bookings.filter((b) => [
      'PENDING_PAYMENT', 'WAITING_DRIVER_APPROVAL', 'CONFIRMED',
    ].includes(b.status)).length,
    COMPLETED: bookings.filter((b) => b.status === 'COMPLETED').length,
    CANCELED: bookings.filter((b) => [
      'REJECTED_BY_DRIVER', 'CANCELLED_BY_USER', 'CANCELLED_BY_DRIVER',
      'CANCELLED_PAYMENT_FAILED', 'EXPIRED',
    ].includes(b.status)).length,
  };

  function doCancel(b) {
    // Cho phép huỷ khi: PENDING_PAYMENT (chưa trả), WAITING_DRIVER_APPROVAL (đã trả nhưng chờ duyệt), CONFIRMED (đã duyệt)
    const cancellable = ['PENDING_PAYMENT', 'WAITING_DRIVER_APPROVAL', 'CONFIRMED'].includes(b.status);
    if (!cancellable) return;

    // Xác định có thông báo hoàn tiền không
    const isStripe = b.paymentMethod === 'STRIPE';
    const hasMoney = ['HOLDING', 'PAID'].includes(b.paymentStatus);
    let detail = 'Bạn có chắc muốn huỷ booking này?';
    if (isStripe && hasMoney) {
      detail = 'Bạn sẽ được hoàn tiền 100% qua Stripe trong 5-10 ngày làm việc.';
    } else if (isStripe && b.paymentStatus === 'PENDING') {
      detail = 'Bạn chưa thanh toán. Booking sẽ được huỷ và không có giao dịch nào xảy ra.';
    }

    Alert.alert(
      'Xác nhận huỷ booking',
      detail,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Huỷ & hoàn tiền',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(b.id, 'Khách hủy từ app');
              setActionMsg(
                isStripe && hasMoney
                  ? 'Đã huỷ. Tiền sẽ được hoàn về trong vài ngày.'
                  : 'Đã huỷ booking'
              );
              load();
            } catch (e) {
              setActionMsg(e.response?.data?.message || 'Lỗi huỷ');
            }
          },
        },
      ]
    );
  }

  async function doPay(b) {
    const result = await payWithStripe({ bookingId: b.id, paymentId: b.paymentId });
    if (result.success) {
      setActionMsg('Đặt cọc thành công. Tiền đang được giữ an toàn.');
    }
    load();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.heading, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RIDEUP</Text>
          <Text style={styles.title}>Chuyến xe của tôi</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={colors.primaryAccent} />
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
          const canCancel = ['PENDING_PAYMENT', 'WAITING_DRIVER_APPROVAL', 'CONFIRMED'].includes(b.status);
          // Chỉ còn cần trả tiền khi: còn PENDING_PAYMENT + chọn STRIPE + chưa authorize
          // (paymentStatus vẫn PENDING). Sau khi thanh toán xong, paymentStatus → HOLDING.
          const canPay = b.status === 'PENDING_PAYMENT'
            && b.paymentMethod === 'STRIPE'
            && b.paymentStatus === 'PENDING';
          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>Mã: <Text style={{ fontWeight: '700' }}>{b.bookingCode}</Text></Text>
                  <View style={styles.tripTimeRow}>
                    <MaterialCommunityIcons name="bus" size={15} color={colors.textDark} />
                    <Text style={styles.tripTime}>Khởi hành: {fmtTime(b.tripDeparture)}</Text>
                  </View>
                  {!!b.tripPlate && <Text style={styles.muted}>Xe: {b.tripPlate}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  {!!meta.icon && <MaterialCommunityIcons name={meta.icon} size={12} color={meta.fg} />}
                  <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.metrics}>
                <View style={styles.metric}><Text style={styles.metricLabel}>Số ghế</Text><Text style={styles.metricValue}>{b.seatCount}</Text></View>
                <View style={styles.metric}><Text style={styles.metricLabel}>Tổng tiền</Text><Text style={[styles.metricValue, { color: colors.success }]}>{fmtMoney(b.totalAmount)}</Text></View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Thanh toán</Text>
                  {(() => {
                    const pm = PAYMENT_STATUS_META[b.paymentStatus] || {};
                    const fg = pm.fg || colors.textDark;
                    return (
                      <View style={styles.payStatusRow}>
                        {!!pm.icon && <MaterialCommunityIcons name={pm.icon} size={13} color={fg} />}
                        <Text style={[styles.metricValue, { color: fg }]}>{pm.label || b.paymentStatus}</Text>
                      </View>
                    );
                  })()}
                </View>
              </View>

              {!!b.cancelReason && (
                <Text style={styles.cancelReason}>Lý do: {b.cancelReason}</Text>
              )}

              {(canPay || canCancel) && (
                <View style={styles.actionsRow}>
                  {canPay && (
                    <TouchableOpacity
                      style={[styles.payBtn, payLoading && styles.payBtnDisabled]}
                      onPress={() => doPay(b)}
                      disabled={payLoading}
                    >
                      <Text style={styles.payBtnText}>
                        {payLoading ? 'Đang xử lý...' : 'Thanh toán ngay'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canCancel && (
                    <TouchableOpacity style={styles.dangerBtn} onPress={() => doCancel(b)}>
                      <Text style={styles.dangerBtnText}>Huỷ booking</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
  tripTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  tripTime: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  payStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  metrics: { flexDirection: 'row', gap: 24 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, color: colors.textSubtle, marginBottom: 2 },
  metricValue: { fontSize: 12, fontWeight: '700' },
  cancelReason: { marginTop: 8, fontSize: 11, color: colors.dangerText },

  actionsRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  dangerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca' },
  dangerBtnText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  payBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.primary },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: 'white', fontSize: 11, fontWeight: '700' },

  primaryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6, backgroundColor: colors.primary, alignSelf: 'center' },
  primaryBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
});