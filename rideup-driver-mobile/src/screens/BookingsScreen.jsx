import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  confirmBooking,
  confirmCashReceived,
  createReport,
  listDriverBookings,
  listMyConversations,
  listReceivedComplaints,
  listSubmittedComplaints,
  rejectBooking,
} from '../api/api';
import { colors, shadow } from '../theme';
import IconText from '../components/IconText';
import BookingMap from '../components/BookingMap';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../components/Typography';
import { useDialog } from '../components/AppDialog';
import { useRealtimeRefresh } from '../realtime/useRealtime';
import { NOTIFICATIONS_CHANGED } from '../hooks/useUnreadNotifications';
import { loadUnreadChatBookingIds } from '../utils/chatUnread';
import ComplaintFormModal from '../components/ComplaintFormModal';

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

// nhóm theo việc tài xế cần làm, thứ tự cũng là ưu tiên khi tự chọn tab
const FILTERS = [
  { key: 'PENDING', label: 'Chờ duyệt', statuses: ['WAITING_DRIVER_APPROVAL'], empty: 'Không có khách nào đang chờ bạn duyệt.' },
  { key: 'CONFIRMED', label: 'Đã nhận', statuses: ['CONFIRMED'], empty: 'Chưa có khách nào được duyệt.' },
  { key: 'COMPLETED', label: 'Hoàn thành', statuses: ['COMPLETED'], empty: 'Chưa có chuyến đi nào hoàn thành.' },
  { key: 'UNPAID', label: 'Chờ thanh toán', statuses: ['PENDING_PAYMENT'], empty: 'Không có khách nào đang thanh toán dở.' },
  {
    key: 'CANCELLED',
    label: 'Huỷ / từ chối',
    statuses: ['REJECTED_BY_DRIVER', 'CANCELLED_BY_USER', 'CANCELLED_BY_DRIVER', 'CANCELLED_PAYMENT_FAILED', 'EXPIRED'],
    empty: 'Không có booking bị huỷ hoặc từ chối.',
  },
];

const CHAT_CLOSED_STATUSES = ['COMPLETED', 'CANCELLED_BY_USER', 'CANCELLED_BY_DRIVER', 'CANCELLED_PAYMENT_FAILED', 'EXPIRED', 'REJECTED_BY_DRIVER'];

export default function BookingsScreen({ navigation, route }) {
  const dialog = useDialog();
  const tripId = route?.params?.tripId || null;
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [conversationByBooking, setConversationByBooking] = useState({});
  const [chatUnread, setChatUnread] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('PENDING');
  const [actionMsg, setActionMsg] = useState('');
  const [section, setSection] = useState('BOOKINGS');
  const [complaintView, setComplaintView] = useState('SUBMITTED');
  const [submittedComplaints, setSubmittedComplaints] = useState([]);
  const [receivedComplaints, setReceivedComplaints] = useState([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [reportBooking, setReportBooking] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const autoPicked = useRef(false);

  async function load() {
    try {
      setReportsLoaded(false);
      const [all, conversations, unreadChats, submitted, received] = await Promise.all([
        listDriverBookings(),
        listMyConversations().catch(() => []),
        loadUnreadChatBookingIds(),
        listSubmittedComplaints().catch(() => []),
        listReceivedComplaints().catch(() => []),
      ]);
      setChatUnread(unreadChats);
      setBookings(all || []);
      setConversationByBooking(Object.fromEntries(
        conversations.map((conversation) => [conversation.bookingId, conversation]),
      ));
      setSubmittedComplaints(submitted || []);
      setReceivedComplaints(received || []);
      setReportsLoaded(true);
    } catch (e) {
      setActionMsg(`${e.response?.data?.message || 'Lỗi tải booking'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  useRealtimeRefresh(load, ['BOOKING_UPDATED', 'NOTIFICATION_CREATED']);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NOTIFICATIONS_CHANGED, load);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!actionMsg) return undefined;
    const timer = setTimeout(() => setActionMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [actionMsg]);

  const scoped = useMemo(
    () => (tripId ? bookings.filter((b) => b.tripId === tripId) : bookings),
    [bookings, tripId],
  );
  const counts = useMemo(() => Object.fromEntries(
    FILTERS.map((f) => [f.key, scoped.filter((b) => f.statuses.includes(b.status)).length]),
  ), [scoped]);
  const activeFilter = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const visible = scoped.filter((b) => activeFilter.statuses.includes(b.status));
  const scopedSubmittedComplaints = tripId
    ? submittedComplaints.filter((complaint) => complaint.tripId === tripId)
    : submittedComplaints;
  const scopedReceivedComplaints = tripId
    ? receivedComplaints.filter((complaint) => complaint.tripId === tripId)
    : receivedComplaints;
  const visibleComplaints = complaintView === 'SUBMITTED'
    ? scopedSubmittedComplaints
    : scopedReceivedComplaints;

  useEffect(() => {
    if (loading || autoPicked.current) return;
    autoPicked.current = true;
    const first = FILTERS.find((f) => counts[f.key] > 0);
    if (first) setFilter(first.key);
  }, [loading, counts]);

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

  async function doReject(b) {
    const refundNote = b.paymentMethod === 'STRIPE'
      ? '\n\nKhách sẽ được hoàn lại tiền nếu đã thanh toán.'
      : '';
    const reason = await dialog.prompt({
      title: 'Từ chối booking',
      message: `Lý do từ chối booking ${b.bookingCode}?${refundNote}`,
      defaultValue: 'Tài xế không nhận',
      confirmText: 'Từ chối',
      cancelText: 'Không',
      danger: true,
    });
    if (reason === null) return;

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

  async function submitComplaint(form) {
    if (!reportBooking || reportSubmitting) return false;
    setReportSubmitting(true);
    setReportError('');
    try {
      await createReport({
        bookingId: reportBooking.id,
        reportedUserId: reportBooking.customerId,
        ...form,
      });
      setActionMsg('Đã gửi khiếu nại, chờ Admin xác minh');
      setReportBooking(null);
      load();
      return true;
    } catch (e) {
      setReportError(e.response?.data?.message || 'Lỗi gửi khiếu nại');
      return false;
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.heading, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AllTrips')}
          style={[styles.refreshBtn, { marginRight: 10 }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primaryAccent} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RIDEUP</Text>
          <Text style={styles.title}>{tripId ? 'Booking của chuyến này' : 'Booking của tôi'}</Text>
        </View>
        <TouchableOpacity onPress={() => { setRefreshing(true); load(); }} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={colors.primaryAccent} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionTabs}>
        {[
          ['BOOKINGS', 'Chuyến xe'],
          ['COMPLAINTS', 'Khiếu nại'],
        ].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.sectionTab, section === key && styles.sectionTabActive]}
            onPress={() => setSection(key)}
          >
            <Text style={[styles.sectionTabText, section === key && styles.sectionTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'COMPLAINTS' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
            contentContainerStyle={styles.filtersContent}
          >
            {[
              ['SUBMITTED', 'Khiếu nại đã gửi', scopedSubmittedComplaints.length],
              ['RECEIVED', 'Bị khiếu nại', scopedReceivedComplaints.length],
            ].map(([key, label, count]) => (
              <TouchableOpacity
                key={key}
                style={[styles.filter, complaintView === key && styles.filterActive]}
                onPress={() => setComplaintView(key)}
              >
                <Text style={[styles.filterText, complaintView === key && styles.filterTextActive]}>
                  {label}<Text style={styles.filterCount}> {count}</Text>
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!!actionMsg && <Text style={styles.actionMsg}>{actionMsg}</Text>}
          <FlatList
            data={visibleComplaints}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>
                  {loading ? 'Đang tải...' : 'Chưa có khiếu nại nào trong mục này.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.complaintCard}>
                <View style={styles.complaintCardHead}>
                  <Text style={styles.complaintTitle}>{item.title}</Text>
                  <Text style={styles.complaintStatus}>{item.status === 'PENDING' ? 'Đang xử lý' : item.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}</Text>
                </View>
                <Text style={styles.complaintMeta}>Booking: {item.bookingCode || item.bookingId}</Text>
                <Text style={styles.complaintMeta}>
                  {complaintView === 'SUBMITTED' ? `Người bị khiếu nại: ${item.reportedUserName}` : `Người khiếu nại: ${item.reporterName}`}
                </Text>
                <Text style={styles.complaintMeta}>Loại: {categoryLabel(item.category)}</Text>
                <Text style={styles.complaintDescription}>{item.description}</Text>
                <Text style={styles.complaintMeta}>Gửi lúc: {fmtTime(item.createdAt)}</Text>
                {!!item.evidenceUrl && <Text style={styles.evidenceText}>Đã đính kèm ảnh bằng chứng</Text>}
              </View>
            )}
          />
        </>
      ) : (
        <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filter, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label} <Text style={styles.filterCount}>{counts[f.key]}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!!actionMsg && <Text style={styles.actionMsg}>{actionMsg}</Text>}

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>{scoped.length === 0 && tripId ? 'Chuyến này chưa có khách đặt.' : activeFilter.empty}</Text>
            </View>
          ) : <Text style={styles.muted}>Đang tải...</Text>
        }
        renderItem={({ item: b }) => {
          const meta = STATUS_META[b.status] || { label: b.status, bg: colors.pendingBg, fg: '#92400e' };
          const conversation = conversationByBooking[b.id];
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
                <View style={styles.bookingSummary}>
                  <Text style={styles.code}>Mã: <Text style={{ fontWeight: '700' }}>{b.bookingCode}</Text></Text>
                  <IconText name="bus" size={14} textStyle={styles.muted}>Khởi hành: {fmtTime(b.tripDeparture)}</IconText>
                  <IconText name={payMeta.icon} size={14} textStyle={styles.muted}>{payMeta.label}{isCash ? ' · Tiền mặt' : ''}</IconText>
                </View>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  {!!meta.icon && <MaterialCommunityIcons name={meta.icon} size={12} color={meta.fg} />}
                  <Text numberOfLines={1} style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
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
              {b.driverReviewRating != null && (
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewLabel}>Đánh giá của khách</Text>
                  <View style={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <MaterialCommunityIcons
                        key={star}
                        name={star <= b.driverReviewRating ? 'star' : 'star-outline'}
                        size={16}
                        color="#f2a900"
                      />
                    ))}
                    <Text style={styles.reviewValue}>{b.driverReviewRating}/5</Text>
                  </View>
                </View>
              )}

              <View style={styles.actions}>
                {!!conversation && !CHAT_CLOSED_STATUSES.includes(b.status) && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnChat]}
                  onPress={() => navigation.navigate('Chat', {
                    conversationId: conversation.conversationId,
                    bookingId: b.id,
                    name: b.userName,
                  })}
                >
                  <IconText name="message-text-outline" size={14} center textStyle={styles.btnChatText}>
                    Chat với khách
                  </IconText>
                  {chatUnread.has(b.id) && <View style={styles.unreadDot} />}
                </TouchableOpacity>
                )}
                {b.status === 'COMPLETED' && !!b.customerId && reportsLoaded && (
                  scopedSubmittedComplaints.some((complaint) => complaint.bookingId === b.id) ? (
                    <TouchableOpacity style={[styles.btn, styles.btnDisabled]} disabled>
                      <Text style={styles.btnDisabledText}>Đã khiếu nại</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnComplaint]}
                      onPress={() => { setReportError(''); setReportBooking(b); }}
                    >
                      <Text style={styles.btnComplaintText}>Khiếu nại khách</Text>
                    </TouchableOpacity>
                  )
                )}
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
        </>
      )}
      <ComplaintFormModal
        visible={!!reportBooking}
        submitting={reportSubmitting}
        error={reportError}
        onClose={() => { if (!reportSubmitting) setReportBooking(null); }}
        onSubmit={submitComplaint}
      />
    </View>
  );
}

const hasPoint = (lat, lng) => lat != null && lng != null;

function categoryLabel(category) {
  return {
    SAFETY: 'An toàn',
    HARASSMENT: 'Quấy rối',
    FRAUD: 'Gian lận',
    PROPERTY_DAMAGE: 'Hư hỏng tài sản',
    OTHER: 'Khác',
  }[category] || category;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  kicker: { fontSize: 10, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 1.5 },
  title: { marginTop: 3, fontSize: 20, fontWeight: '800', color: colors.text },
  refreshBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { color: colors.primaryAccent, fontSize: 19, fontWeight: '700' },
  sectionTabs: { flexDirection: 'row', marginHorizontal: 14, marginTop: 12, borderRadius: 12, padding: 3, backgroundColor: '#eaf0ed' },
  sectionTab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  sectionTabActive: { backgroundColor: '#fff' },
  sectionTabText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  sectionTabTextActive: { color: colors.primaryAccent },
  filters: { marginTop: 8, marginBottom: 6, flexGrow: 0, flexShrink: 0 },
  filtersContent: { paddingHorizontal: 14, paddingVertical: 6, gap: 6, alignItems: 'center' },
  filter: { flexShrink: 0, paddingHorizontal: 13, paddingVertical: 5, minHeight: 32, justifyContent: 'center', borderWidth: 1, borderColor: '#e1ebe7', borderRadius: 16, backgroundColor: 'white' },
  filterActive: { borderColor: colors.primaryAccent, backgroundColor: colors.primaryLight },
  filterText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: colors.primaryAccent, fontWeight: '500' },
  filterCount: { fontSize: 11, color: colors.textSubtle },

  actionMsg: { padding: 12, marginHorizontal: 14, marginBottom: 6, backgroundColor: colors.primaryFaintest, borderRadius: 12, fontSize: 13, color: colors.textDark },
  listContent: { padding: 14, paddingBottom: 28 },
  muted: { color: colors.textSubtle, fontSize: 14, marginTop: 2 },
  emptyBox: { padding: 38, borderRadius: 16, backgroundColor: 'white', alignItems: 'center' },

  card: { marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#e3ece8', borderRadius: 18, backgroundColor: 'white', ...shadow(2, 0.07, 7) },
  complaintCard: { marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#e3ece8', borderRadius: 18, backgroundColor: 'white', ...shadow(2, 0.07, 7) },
  complaintCardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  complaintTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textDark },
  complaintStatus: { fontSize: 12, fontWeight: '700', color: colors.primaryAccent },
  complaintMeta: { marginTop: 5, fontSize: 13, color: colors.textSubtle },
  complaintDescription: { marginTop: 9, fontSize: 14, lineHeight: 20, color: colors.textDark },
  evidenceText: { marginTop: 6, fontSize: 13, color: colors.primaryAccent },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  bookingSummary: { flex: 1, minWidth: 0 },
  code: { fontSize: 12, color: colors.textSubtle, marginBottom: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start', flexShrink: 0 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  metrics: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metric: { flex: 1, minWidth: 80 },
  metricLabel: { fontSize: 12, color: colors.textSubtle, marginBottom: 3 },
  metricValue: { fontSize: 14, fontWeight: '800' },
  note: { marginTop: 8, fontSize: 13, color: colors.textDark, fontStyle: 'italic' },
  reviewCard: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#fff8e6' },
  reviewLabel: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginBottom: 5 },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewValue: { marginLeft: 5, fontSize: 14, fontWeight: '700', color: '#9a6700' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { borderColor: colors.primary },
  btnPrimaryText: { color: colors.primary, fontSize: 14 },
  btnDanger: { borderColor: '#d1d5db' },
  btnDangerText: { color: colors.textDark, fontSize: 14 },
  btnComplaint: { borderColor: '#d1d5db' },
  btnComplaintText: { color: colors.textDark, fontSize: 14 },
  btnDisabledText: { color: colors.textDark, fontSize: 14 },
  btnSecondary: { borderColor: colors.primary },
  btnSecondaryText: { color: colors.primary, fontSize: 14 },
  btnChat: { borderColor: colors.primary },
  btnChatText: { color: colors.primary, fontSize: 14 },
  btnDisabled: { borderColor: '#d1d5db', opacity: 0.55 },
  unreadDot: { position: 'absolute', top: -4, right: -4, width: 11, height: 11, borderRadius: 6, backgroundColor: '#dc2626', borderWidth: 2, borderColor: 'white' },
});