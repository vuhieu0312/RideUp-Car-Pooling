import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import {
  cancelBooking,
  createDriverReview,
  createReport,
  listMyBookings,
  listMyConversations,
  listReceivedComplaints,
  listSubmittedComplaints,
} from '../api/api';
import { usePayment } from '../hooks/usePayment';
import { useDialog } from '../components/AppDialog';
import { useRealtimeRefresh } from '../realtime/useRealtime';
import { colors, shadow } from '../theme';
import { Text } from '../components/Typography';
import ComplaintFormModal from '../components/ComplaintFormModal';

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
  const dialog = useDialog();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [actionMsg, setActionMsg] = useState('');
  const [conversationByBooking, setConversationByBooking] = useState({});
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [section, setSection] = useState('BOOKINGS');
  const [complaintView, setComplaintView] = useState('SUBMITTED');
  const [submittedComplaints, setSubmittedComplaints] = useState([]);
  const [receivedComplaints, setReceivedComplaints] = useState([]);
  const [reportBooking, setReportBooking] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportsLoaded, setReportsLoaded] = useState(false);

  function load(silent = false) {
    if (!silent) setLoading(true);
    setReportsLoaded(false);
    Promise.all([
      listMyBookings(),
      listMyConversations().catch(() => []),
      listSubmittedComplaints(),
      listReceivedComplaints(),
    ])
      .then(([myBookings, conversations, submitted, received]) => {
        setBookings(myBookings);
        setConversationByBooking(Object.fromEntries(
          conversations.map((conversation) => [conversation.bookingId, conversation]),
        ));
        setSubmittedComplaints(submitted || []);
        setReceivedComplaints(received || []);
        setReportsLoaded(true);
      })
      .catch((e) => setActionMsg(e.response?.data?.message || 'Lỗi tải chuyến xe và khiếu nại'))
      .finally(() => setLoading(false));
  }

  // tab navigator giữ screen mounted nên rời tab phải tự xoá banner
  useFocusEffect(useCallback(() => {
    load();
    return () => setActionMsg('');
  }, []));

  useRealtimeRefresh(() => load(true), ['BOOKING_UPDATED']);

  useEffect(() => {
    if (!actionMsg) return undefined;
    const t = setTimeout(() => setActionMsg(''), 3000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  // FlatList + key={filter} để remount, scroll về 0 khi đổi filter

  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  const fmtDeparture = (iso) => {
    if (!iso) return '';
    const [date, time] = iso.split('T');
    const [, month, day] = date.split('-');
    return `${time.substring(0, 5)} · ${day}/${month}`;
  };

  const place = (ward, province, fallback) => [ward || fallback, province].filter(Boolean).join(', ');

  function routeText(b) {
    const from = place(b.pickupWardName, b.tripStartProvince, b.pickupAddressText);
    const to = place(b.dropoffWardName, b.tripEndProvince, b.dropoffAddressText);
    return `${from} → ${to}`;
  }

  function showDetail(b) {
    const meta = STATUS_META[b.status] || { label: b.status };
    const pm = PAYMENT_STATUS_META[b.paymentStatus] || {};
    const lines = [
      `Mã: ${b.bookingCode}`,
      `Trạng thái: ${meta.label}`,
      `Khởi hành: ${fmtDeparture(b.tripDeparture)}`,
      `Điểm đón: ${place(b.pickupWardName, b.tripStartProvince, b.pickupAddressText)}`,
      `Điểm trả: ${place(b.dropoffWardName, b.tripEndProvince, b.dropoffAddressText)}`,
      `Tài xế: ${b.driverName || '—'}`,
    ];
    if (b.driverPhone) lines.push(`Điện thoại tài xế: ${b.driverPhone}`);
    if (b.tripPlate) lines.push(`Xe: ${[b.tripVehicle, b.tripPlate].filter(Boolean).join(' · ')}`);
    lines.push(
      `Số ghế: ${b.seatCount} × ${fmtMoney(b.pricePerSeat)}`,
      `Tổng tiền: ${fmtMoney(b.totalAmount)}`,
      `Thanh toán: ${pm.label || b.paymentStatus || '—'}`,
    );
    if (b.note) lines.push(`Ghi chú: ${b.note}`);
    if (b.cancelReason) lines.push(`Lý do huỷ: ${b.cancelReason}`);
    dialog.alert('Chi tiết booking', lines.join('\n'));
  }

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

  async function doCancel(b) {
    const cancellable = ['PENDING_PAYMENT', 'WAITING_DRIVER_APPROVAL', 'CONFIRMED'].includes(b.status);
    if (!cancellable) return;

    const isStripe = b.paymentMethod === 'STRIPE';
    const hasMoney = ['HOLDING', 'PAID'].includes(b.paymentStatus);
    let detail = 'Bạn có chắc muốn huỷ booking này?';
    if (isStripe && hasMoney) {
      detail = 'Bạn sẽ được hoàn lại toàn bộ tiền đặt cọc.';
    } else if (isStripe && b.paymentStatus === 'PENDING') {
      detail = 'Bạn chưa thanh toán. Booking sẽ được huỷ và không có giao dịch nào xảy ra.';
    }

    const ok = await dialog.confirm({
      title: 'Xác nhận huỷ booking',
      message: detail,
      confirmText: hasMoney ? 'Huỷ & hoàn tiền' : 'Huỷ booking',
      cancelText: 'Không',
      danger: true,
    });
    if (!ok) return;

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
  }

  async function doPay(b) {
    const result = await payWithStripe({ bookingId: b.id, paymentId: b.paymentId });
    if (result.success) {
      setActionMsg('Đặt cọc thành công. Tiền đang được giữ an toàn.');
    }
    load();
  }

  async function submitReview() {
    if (!reviewBooking || !reviewRating || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      await createDriverReview(reviewBooking.tripId, reviewRating);
      setReviewBooking(null);
      setReviewRating(0);
      setReviewError('');
      setActionMsg('Đã gửi đánh giá tài xế');
      load(true);
    } catch (e) {
      setReviewError(e.response?.data?.message || 'Lỗi gửi đánh giá');
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function submitComplaint(form) {
    if (!reportBooking || reportSubmitting) return false;
    setReportSubmitting(true);
    setReportError('');
    try {
      await createReport({
        bookingId: reportBooking.id,
        reportedUserId: reportBooking.driverId,
        ...form,
      });
      setActionMsg('Đã gửi khiếu nại, chờ Admin xác minh');
      setReportBooking(null);
      load(true);
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
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RIDEUP</Text>
          <Text style={styles.title}>Chuyến xe của tôi</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
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
              ['SUBMITTED', 'Khiếu nại đã gửi', submittedComplaints.length],
              ['RECEIVED', 'Bị khiếu nại', receivedComplaints.length],
            ].map(([key, label, count]) => (
              <TouchableOpacity
                key={key}
                style={[styles.filter, complaintView === key && styles.filterActive]}
                onPress={() => setComplaintView(key)}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  style={[styles.filterText, complaintView === key && styles.filterTextActive]}
                >
                  {label}<Text style={styles.filterCount}> {count}</Text>
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!!actionMsg && <Text style={styles.actionMsg}>{actionMsg}</Text>}
          <FlatList
            data={complaintView === 'SUBMITTED' ? submittedComplaints : receivedComplaints}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
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
                {!!item.evidenceUrl && <Text style={styles.evidenceText}>Bằng chứng: {item.evidenceUrl}</Text>}
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
          const conversation = conversationByBooking[b.id];
          const canCancel = ['PENDING_PAYMENT', 'WAITING_DRIVER_APPROVAL', 'CONFIRMED'].includes(b.status);
          // chỉ cần trả tiền khi PENDING_PAYMENT + STRIPE + paymentStatus còn PENDING
          const canPay = b.status === 'PENDING_PAYMENT'
            && b.paymentMethod === 'STRIPE'
            && b.paymentStatus === 'PENDING';
          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.bookingSummary}>
                  <Text style={styles.code}>Mã: <Text style={{ fontWeight: '700' }}>{b.bookingCode}</Text></Text>
                  <View style={styles.tripTimeRow}>
                    <MaterialCommunityIcons name="bus" size={15} color={colors.textDark} />
                    <Text style={styles.tripTime}>Khởi hành {fmtDeparture(b.tripDeparture)}</Text>
                  </View>
                  <Text style={styles.route} numberOfLines={2}>{routeText(b)}</Text>
                  {!!b.tripPlate && <Text style={styles.muted}>Xe: {b.tripPlate}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  {!!meta.icon && <MaterialCommunityIcons name={meta.icon} size={12} color={meta.fg} />}
                  <Text numberOfLines={1} style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
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

              <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.detailBtn, b.status === 'COMPLETED' && styles.completedActionButton]}
                    onPress={() => showDetail(b)}
                  >
                    <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                  </TouchableOpacity>
                  {b.status === 'COMPLETED' && (
                    b.driverReviewRating ? (
                      <TouchableOpacity
                        style={[styles.reviewButton, styles.reviewButtonDisabled, styles.reviewButtonReviewed, styles.completedActionButton]}
                        disabled
                        accessibilityRole="button"
                        accessibilityState={{ disabled: true }}
                        accessibilityLabel={`Đã đánh giá ${b.driverReviewRating} trên 5 sao`}
                      >
                        <Text style={styles.reviewButtonText}>Đã đánh giá</Text>
                        <RatingStars rating={b.driverReviewRating} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.reviewButton, styles.completedActionButton]}
                        onPress={() => {
                          setReviewBooking(b);
                          setReviewRating(0);
                          setReviewError('');
                        }}
                      >
                        <MaterialCommunityIcons name="star-outline" size={16} color="#d99000" />
                        <Text style={styles.reviewButtonText}>Đánh giá</Text>
                      </TouchableOpacity>
                    )
                  )}
                  {conversation && (
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => navigation.navigate('Chat', {
                        conversationId: conversation.conversationId,
                        bookingId: b.id,
                        name: b.driverName,
                      })}>
                      <MaterialCommunityIcons name="message-text-outline" size={14} color={colors.primaryAccent} />
                      <Text style={styles.chatBtnText}>Chat tài xế</Text>
                    </TouchableOpacity>
                  )}
                  {b.status === 'COMPLETED' && !!b.driverId && reportsLoaded && (
                    submittedComplaints.some((complaint) => complaint.bookingId === b.id) ? (
                      <TouchableOpacity style={[styles.detailBtn, styles.reportButtonDisabled]} disabled>
                        <Text style={styles.detailBtnText}>Đã khiếu nại</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() => { setReportError(''); setReportBooking(b); }}
                      >
                        <Text style={styles.detailBtnText}>Khiếu nại tài xế</Text>
                      </TouchableOpacity>
                    )
                  )}
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
            </View>
          );
        }}
      />
        </>
      )}
      <Modal
        visible={!!reviewBooking}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewBooking(null)}
      >
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewModal}>
            <Text style={styles.reviewTitle}>Đánh giá tài xế</Text>
            <Text style={styles.reviewPrompt}>Bạn hài lòng với chuyến đi như thế nào?</Text>
            {!!reviewError && <Text style={styles.reviewError}>{reviewError}</Text>}
            <View style={styles.ratingPicker}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} sao`}
                  onPress={() => setReviewRating(star)}
                  disabled={reviewSubmitting}
                >
                  <MaterialCommunityIcons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={38}
                    color={star <= reviewRating ? '#f2a900' : colors.textSubtle}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>{reviewRating ? `${reviewRating}/5 sao` : 'Chọn số sao'}</Text>
            <View style={styles.reviewModalActions}>
              <TouchableOpacity
                style={styles.reviewCancel}
                onPress={() => setReviewBooking(null)}
                disabled={reviewSubmitting}
              >
                <Text style={styles.reviewCancelText}>Để sau</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reviewSubmit, (!reviewRating || reviewSubmitting) && styles.reviewSubmitDisabled]}
                onPress={submitReview}
                disabled={!reviewRating || reviewSubmitting}
              >
                <Text style={styles.reviewSubmitText}>{reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

function RatingStars({ rating }) {
  return (
    <View style={styles.ratingStars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={15}
          color="#f2a900"
        />
      ))}
    </View>
  );
}

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
  kicker: { fontSize: 9, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 1.5 },
  title: { marginTop: 3, fontSize: 20, fontWeight: '700', color: colors.text },
  refreshBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sectionTabs: { flexDirection: 'row', marginHorizontal: 12, marginTop: 12, borderRadius: 9, padding: 3, backgroundColor: '#eaf0ed' },
  sectionTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 7 },
  sectionTabActive: { backgroundColor: '#fff' },
  sectionTabText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  sectionTabTextActive: { color: colors.primaryAccent },
  filters: { marginTop: 10, marginBottom: 10, flexGrow: 0 },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  filter: {
    flexShrink: 0,
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
  complaintCard: { marginBottom: 9, padding: 13, borderWidth: 1, borderColor: '#e3ece8', borderRadius: 10, backgroundColor: 'white', ...shadow(2, 0.07, 7) },
  complaintCardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  complaintTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textDark },
  complaintStatus: { fontSize: 10, fontWeight: '700', color: colors.primaryAccent },
  complaintMeta: { marginTop: 5, fontSize: 11, color: colors.textSubtle },
  complaintDescription: { marginTop: 9, fontSize: 12, lineHeight: 18, color: colors.textDark },
  evidenceText: { marginTop: 6, fontSize: 11, color: colors.primaryAccent },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  bookingSummary: { flex: 1, minWidth: 0 },
  code: { fontSize: 10, color: colors.textSubtle, marginBottom: 4 },
  tripTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  tripTime: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  payStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start', flexShrink: 0 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  metrics: { flexDirection: 'row', gap: 24 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, color: colors.textSubtle, marginBottom: 2 },
  metricValue: { fontSize: 12, fontWeight: '700' },
  cancelReason: { marginTop: 8, fontSize: 11, color: colors.dangerText },
  ratingStars: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  reviewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 14, minWidth: 102, borderRadius: 6, backgroundColor: '#fff8e6' },
  reviewButtonDisabled: { opacity: 0.75 },
  reviewButtonReviewed: { flexDirection: 'column', gap: 2 },
  reviewButtonText: { color: '#9a6700', fontSize: 11, fontWeight: '700' },
  reviewOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  reviewModal: { width: '100%', maxWidth: 380, padding: 22, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center' },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  reviewPrompt: { marginTop: 8, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  reviewError: { marginTop: 10, fontSize: 12, color: colors.dangerText, textAlign: 'center' },
  ratingPicker: { flexDirection: 'row', gap: 8, marginTop: 18 },
  ratingLabel: { marginTop: 8, fontSize: 13, fontWeight: '700', color: '#9a6700' },
  reviewModalActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', justifyContent: 'flex-end', marginTop: 22 },
  reviewCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f1f5f9' },
  reviewCancelText: { color: colors.textDark, fontWeight: '600' },
  reviewSubmit: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primary },
  reviewSubmitDisabled: { opacity: 0.5 },
  reviewSubmitText: { color: '#fff', fontWeight: '700' },

  actionsRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  route: { fontSize: 12, color: colors.textDark, marginTop: 3 },
  detailBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' },
  completedActionButton: { width: 102, flexGrow: 0 },
  detailBtnText: { color: colors.primaryAccent, fontSize: 11, fontWeight: '700' },
  reportButtonDisabled: { opacity: 0.65 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primaryAccent },
  chatBtnText: { color: colors.primaryAccent, fontSize: 11, fontWeight: '700' },
  dangerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca' },
  dangerBtnText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  payBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.primary },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: 'white', fontSize: 11, fontWeight: '700' },

  primaryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6, backgroundColor: colors.primary, alignSelf: 'center' },
  primaryBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
});