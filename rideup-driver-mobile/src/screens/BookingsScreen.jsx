import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  confirmBooking,
  confirmCashReceived,
  listDriverBookings,
  rejectBooking,
} from '../api/api';
import { colors, shadow } from '../theme';
import IconText from '../components/IconText';
import BookingMap from '../components/BookingMap';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../components/Typography';

const STATUS_META = {
  PENDING_PAYMENT: { icon: 'credit-card-outline', label: 'Chờ thanh toán', bg: colors.pendingBg, fg: '#92400e' },
  WAITING_DRIVER_APPROVAL: { icon: 'clock-outline', label: 'Chờ duyệt', bg: colors.pendingBg, fg: '#92400e' },
  CONFIRMED: { icon: 'check-circle-outline', label: 'Đã xác nhận', bg: colors.successBg, fg: colors.successDark },
  COMPLETED: { icon: 'check-all', label: 'Hoàn thành', bg: colors.successBg, fg: colors.successDark },
  REJECTED_BY_DRIVER: { icon: 'close-circle-outline', label: 'Tài xế từ chối', bg: colors.dangerBg, fg: colors.dangerText },
  CANCELLED_BY_USER: { icon: 'close-circle-outline', label: 'Khách huỷ', bg: colors.dangerBg, fg: colors.dangerText },
  CANCELLED_BY_DRIVER: { icon: 'close-circle-outline', label: 'Tài xế huỷ chuyến', bg: colors.dangerBg, fg: colors.dangerText },
  CANCELLED_PAYMENT_FAILED: { icon: 'alert-circle-outline', label: 'Thanh toán lỗi', bg: colors.dangerBg, fg: colors.dangerText },
  EXPIRED: { icon: 'timer-sand', label: 'Hết hạn', bg: colors.dangerBg, fg: colors.dangerText },
};

const FILTERS = [
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'CONFIRMED', label: 'Đã duyệt' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

export default function BookingsScreen({ navigation, route }) {
  // Mở từ chuyến đang chạy: chỉ hiện khách đã duyệt (người đi chuyến đó)
  const tripId = route?.params?.tripId || null;
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('PENDING');
  const [actionMsg, setActionMsg] = useState('');

  async function load() {
    try {
      const all = await listDriverBookings();
      setBookings(all || []);
    } catch (e) {
      setActionMsg(`${e.response?.data?.message || 'Lỗi tải booking'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  const visible = bookings.filter((b) => {
    if (tripId) return b.tripId === tripId && b.status === 'CONFIRMED';
    if (filter === 'PENDING') return b.status === 'WAITING_DRIVER_APPROVAL';
    if (filter === 'CONFIRMED') return b.status === 'CONFIRMED';
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    if (filter === 'CANCELLED') {
      return [
        'REJECTED_BY_DRIVER', 'CANCELLED_BY_USER', 'CANCELLED_BY_DRIVER',
        'CANCELLED_PAYMENT_FAILED', 'EXPIRED',
      ].includes(b.status);
    }
    return true;
  });

  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  async function doConfirm(b) {
    try {
      await confirmBooking(b.id);
      setActionMsg('Đã xác nhận booking');
      load();
    } catch (e) {
      setActionMsg(`${e.response?.data?.message || 'Lỗi'}`);
    }
  }

  function doReject(b) {
    const refundNote = b.paymentMethod === 'STRIPE'
      ? '\n\nKhách hàng sẽ được hoàn tiền 100% nếu đã thanh toán (qua Stripe).'
      : '';
    Alert.prompt?.(
      'Từ chối booking',
      `Lý do từ chối booking ${b.bookingCode}?${refundNote}`,
      async (reason) => {
        try {
          await rejectBooking(b.id, reason || 'Tài xế từ chối');
          setActionMsg(
            b.paymentMethod === 'STRIPE' && b.paymentStatus === 'HOLDING'
              ? 'Đã từ chối. Tiền sẽ được hoàn về cho khách.'
              : 'Đã từ chối booking'
          );
          load();
        } catch (e) {
          setActionMsg(`${e.response?.data?.message || 'Lỗi'}`);
        }
      },
      'plain-text',
      'Tài xế không nhận'
    ) || Alert.alert('Từ chối', 'Chức năng nhập lý do chưa khả dụng trên web. Vui lòng dùng điện thoại.');
  }

  async function doConfirmCash(b) {
    try {
      await confirmCashReceived(b.id);
      setActionMsg('Đã xác nhận nhận tiền mặt');
      load();
    } catch (e) {
      setActionMsg(`${e.response?.data?.message || 'Lỗi'}`);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.heading, { paddingTop: insets.top + 16 }]}>
        {!!tripId && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.refreshBtn, { marginRight: 10 }]}>
            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primaryAccent} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RIDEUP</Text>
          <Text style={styles.title}>{tripId ? 'Khách đi chuyến này' : 'Booking của tôi'}</Text>
        </View>
        <TouchableOpacity onPress={() => { setRefreshing(true); load(); }} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={colors.primaryAccent} />
        </TouchableOpacity>
      </View>

      {!tripId && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filter, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      )}

      {!!actionMsg && <Text style={styles.actionMsg}>{actionMsg}</Text>}

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>{tripId ? 'Chuyến này chưa có khách nào được duyệt.' : 'Không có booking nào trong nhóm này.'}</Text>
            </View>
          ) : <Text style={styles.muted}>Đang tải...</Text>
        }
        renderItem={({ item: b }) => {
          const meta = STATUS_META[b.status] || { label: b.status, bg: colors.pendingBg, fg: '#92400e' };
          const PAY_META = {
            PENDING: { icon: 'clock-outline', label: 'Chờ thanh toán' },
            HOLDING: { icon: 'lock-outline', label: 'Đã đặt cọc' },
            PAID: { icon: 'check-circle-outline', label: 'Đã thanh toán' },
            FAILED: { icon: 'alert-circle-outline', label: 'Thanh toán lỗi' },
            VOIDED: { icon: 'minus-circle-outline', label: 'Đã huỷ thanh toán' },
            REFUNDED: { icon: 'undo-variant', label: 'Đã hoàn tiền' },
          };
          const payMeta = PAY_META[b.paymentStatus] || { icon: 'wallet-outline', label: b.paymentStatus || '—' };
          const isCash = b.paymentMethod === 'CASH';
          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>Mã: <Text style={{ fontWeight: '700' }}>{b.bookingCode}</Text></Text>
                  <IconText name="bus" size={14} textStyle={styles.muted}>Chuyến: {fmtTime(b.reservedAt)}</IconText>
                  <IconText name={payMeta.icon} size={14} textStyle={styles.muted}>{payMeta.label}{isCash ? ' · Tiền mặt' : ''}</IconText>
                </View>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  {!!meta.icon && <MaterialCommunityIcons name={meta.icon} size={12} color={meta.fg} />}
                  <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.metrics}>
                <View style={styles.metric}><Text style={styles.metricLabel}>Khách</Text><Text style={styles.metricValue}>{b.userName || '—'}</Text></View>
                <View style={styles.metric}><Text style={styles.metricLabel}>Ghế</Text><Text style={styles.metricValue}>{b.seatCount}</Text></View>
                <View style={styles.metric}><Text style={styles.metricLabel}>Tổng</Text><Text style={[styles.metricValue, { color: colors.success }]}>{fmtMoney(b.totalAmount)}</Text></View>
              </View>

              {!!b.pickupAddressText && (
                <IconText name="map-marker-outline" size={14} textStyle={styles.muted}>Đón: {b.pickupAddressText}</IconText>
              )}
              {!!b.dropoffAddressText && (
                <IconText name="flag-outline" size={14} textStyle={styles.muted}>Trả: {b.dropoffAddressText}</IconText>
              )}
              <BookingMap
                pickup={hasPoint(b.pickupLat, b.pickupLng) ? { lat: Number(b.pickupLat), lng: Number(b.pickupLng) } : null}
                dropoff={hasPoint(b.dropoffLat, b.dropoffLng) ? { lat: Number(b.dropoffLat), lng: Number(b.dropoffLng) } : null}
              />
              {!!b.note && <IconText name="note-edit-outline" size={13} textStyle={styles.note}>{b.note}</IconText>}

              <View style={styles.actions}>
                {b.status === 'WAITING_DRIVER_APPROVAL' && (
                  <>
                    <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => doReject(b)}>
                      <Text style={styles.btnDangerText}>Từ chối</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => doConfirm(b)}>
                      <Text style={styles.btnPrimaryText}>Duyệt booking</Text>
                    </TouchableOpacity>
                  </>
                )}
                {b.status === 'CONFIRMED' && (
                  <>
                    {isCash && b.paymentStatus !== 'PAID' && (
                      <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => doConfirmCash(b)}>
                        <IconText name="cash" size={14} center textStyle={styles.btnSecondaryText}>Đã nhận tiền</IconText>
                      </TouchableOpacity>
                    )}
                    {/* Sau khi trip STARTED, booking tự động flip sang COMPLETED khi trip kết thúc. */}
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

// Tọa độ khách ghim khi đặt chuyến — hiển thị trên bản đồ ngay trong thẻ booking
const hasPoint = (lat, lng) => lat != null && lng != null;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  kicker: { fontSize: 9, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 1.5 },
  title: { marginTop: 3, fontSize: 20, fontWeight: '700', color: colors.text },
  refreshBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { color: colors.primaryAccent, fontSize: 19, fontWeight: '700' },

  filters: { marginTop: 10, marginBottom: 6, flexGrow: 0 },
  filtersContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, alignItems: 'center' },
  filter: { paddingHorizontal: 10, paddingVertical: 6, height: 30, justifyContent: 'center', borderWidth: 1, borderColor: '#e1ebe7', borderRadius: 14, backgroundColor: 'white' },
  filterActive: { borderColor: colors.primaryAccent, backgroundColor: colors.primaryLight },
  filterText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: colors.primaryAccent, fontWeight: '500' },

  actionMsg: { padding: 9, marginHorizontal: 12, marginBottom: 6, backgroundColor: colors.primaryFaintest, borderRadius: 6, fontSize: 11, color: colors.textDark },
  listContent: { padding: 12, paddingBottom: 24 },
  muted: { color: colors.textSubtle, fontSize: 12, marginTop: 2 },
  emptyBox: { padding: 38, borderRadius: 10, backgroundColor: 'white', alignItems: 'center' },

  card: { marginBottom: 9, padding: 12, borderWidth: 1, borderColor: '#e3ece8', borderRadius: 10, backgroundColor: 'white', ...shadow(2, 0.07, 7) },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  code: { fontSize: 10, color: colors.textSubtle, marginBottom: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  metrics: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metric: { flex: 1, minWidth: 80 },
  metricLabel: { fontSize: 10, color: colors.textSubtle, marginBottom: 2 },
  metricValue: { fontSize: 12, fontWeight: '700' },
  note: { marginTop: 6, fontSize: 11, color: colors.textDark, fontStyle: 'italic' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: 'white', fontSize: 11, fontWeight: '700' },
  btnDanger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca' },
  btnDangerText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  btnSecondary: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  btnSecondaryText: { color: '#92400e', fontSize: 11, fontWeight: '700' },
});