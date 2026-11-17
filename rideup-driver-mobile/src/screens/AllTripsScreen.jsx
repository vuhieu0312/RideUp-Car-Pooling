import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  cancelTrip,
  completeTrip,
  listMyTrips,
  listProvinces,
  listReceivedComplaints,
  listSubmittedComplaints,
  listWards,
  startTrip,
} from '../api/api';
import { colors, FONT, shadow } from '../theme';
import IconText from '../components/IconText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../components/Typography';
import { useDialog } from '../components/AppDialog';
import { useRealtimeRefresh } from '../realtime/useRealtime';

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
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [wardNames, setWardNames] = useState({});
  const [section, setSection] = useState('TRIPS');
  const [complaintView, setComplaintView] = useState('SUBMITTED');
  const [submittedComplaints, setSubmittedComplaints] = useState([]);
  const [receivedComplaints, setReceivedComplaints] = useState([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);

  async function loadWardNames(list) {
    const provinceIds = [...new Set(list.flatMap((t) => [t.startProvinceId, t.endProvinceId]).filter(Boolean))];
    const results = await Promise.all(provinceIds.map((id) => listWards(id).catch(() => [])));
    const map = {};
    results.flat().forEach((w) => { map[w.id] = w.name; });
    setWardNames(map);
  }

  function load(silent = false) {
    if (!silent) setLoading(true);
    setReportsLoaded(false);
    Promise.all([
      listMyTrips(),
      listProvinces(),
      listSubmittedComplaints(),
      listReceivedComplaints(),
    ])
      .then(([t, p, submitted, received]) => {
        setTrips(t);
        setProvinces(p);
        setSubmittedComplaints(submitted || []);
        setReceivedComplaints(received || []);
        setReportsLoaded(true);
        loadWardNames(t);
      })
      .catch((e) => setActionMsg(e.response?.data?.message || 'Lỗi tải chuyến xe và khiếu nại'))
      .finally(() => setLoading(false));
  }

  async function doStartTrip(t) {
    try {
      const res = await startTrip(t.id);
      const updated = res?.data;
      setTrips((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...(updated || {}), status: updated?.status || 'STARTED' } : x)));
      setActionMsg(`Đã bắt đầu chuyến ${t.id.slice(0, 6)}…`);
      load();
    } catch (e) {
      setActionMsg(`${e.response?.data?.message || 'Lỗi bắt đầu'}`);
    }
  }

  async function doCompleteTrip(t) {
    const ok = await dialog.confirm({
      title: 'Kết thúc chuyến',
      message: 'Bạn xác nhận đã hoàn thành chuyến đi này?',
      confirmText: 'Kết thúc',
      cancelText: 'Huỷ',
    });
    if (!ok) return;

    try {
      await completeTrip(t.id);
      setActionMsg(`Đã kết thúc chuyến ${t.id.slice(0, 6)}…`);
      load();
    } catch (e) {
      setActionMsg(`${e.response?.data?.message || 'Lỗi kết thúc'}`);
    }
  }

  async function doCancelTrip(t) {
    const booked = Math.max(0, (t.seatTotal || 0) - (t.seatAvailable || 0));
    const reason = await dialog.prompt({
      title: 'Huỷ chuyến',
      message: `Sẽ hoàn tiền cho tất cả khách đã đặt chuyến này.${booked > 0 ? ` Có ${booked} ghế đã đặt.` : ''}\n\nNhập lý do huỷ chuyến:`,
      defaultValue: 'Tài xế không thể thực hiện chuyến',
      confirmText: 'Huỷ chuyến & hoàn tiền',
      cancelText: 'Không',
      danger: true,
    });
    if (reason === null) return;

    try {
      await cancelTrip(t.id, reason || 'Tài xế huỷ chuyến');
      setActionMsg(`Đã huỷ chuyến ${t.id.slice(0, 6)}… và hoàn tiền cho khách.`);
      load();
    } catch (e) {
      setActionMsg(`${e.response?.data?.message || 'Lỗi huỷ chuyến'}`);
    }
  }

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(true); }, []));

  useRealtimeRefresh(() => load(true), ['TRIP_UPDATED', 'BOOKING_UPDATED']);

  useEffect(() => {
    if (!actionMsg) return undefined;
    const timer = setTimeout(() => setActionMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [actionMsg]);

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

  function stopNames(t, type) {
    const names = (t.stops || [])
      .filter((s) => s.stopType === type)
      .map((s) => wardNames[s.wardId] || s.addressText)
      .filter(Boolean);
    return names.length ? names.join(', ') : 'Chưa chọn';
  }

  return (
    <View style={styles.container}>
      <View style={[styles.heading, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RIDEUP</Text>
          <Text style={styles.title}>Tất cả chuyến xe</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={colors.primaryAccent} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionTabs}>
        {[
          ['TRIPS', 'Chuyến xe'],
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

      {!!actionMsg && <Text style={styles.actionMsg}>{actionMsg}</Text>}

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
          <FlatList
            data={complaintView === 'SUBMITTED' ? submittedComplaints : receivedComplaints}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>
                  {reportsLoaded ? 'Chưa có khiếu nại nào trong mục này.' : 'Đang tải...'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.complaintCard}>
                <View style={styles.complaintCardHead}>
                  <Text style={styles.complaintTitle}>{item.title}</Text>
                  <Text style={styles.complaintStatus}>
                    {item.status === 'PENDING' ? 'Đang xử lý' : item.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                  </Text>
                </View>
                <Text style={styles.complaintMeta}>Booking: {item.bookingCode || item.bookingId}</Text>
                <Text style={styles.complaintMeta}>
                  {complaintView === 'SUBMITTED'
                    ? `Người bị khiếu nại: ${item.reportedUserName}`
                    : `Người khiếu nại: ${item.reporterName}`}
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
                <View style={styles.tripSummary}>
                  <Text style={styles.tripRoute}>
                    {provinceName(t.startProvinceId)} → {provinceName(t.endProvinceId)}
                  </Text>
                  <IconText name="clock-outline" size={14} textStyle={styles.tripTime}>{fmtTime(t.departureTime)}</IconText>
                  <Text style={styles.stopLine} numberOfLines={1}>Đón: {stopNames(t, 'PICKUP')}</Text>
                  <Text style={styles.stopLine} numberOfLines={1}>Trả: {stopNames(t, 'DROPOFF')}</Text>
                  {!!t.note && <Text style={styles.stopLine} numberOfLines={2}>Ghi chú: {t.note}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text numberOfLines={1} style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
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

              <View style={styles.actions}>
                {(t.status === 'OPEN' || t.status === 'FULL') && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionDanger]}
                      onPress={() => doCancelTrip(t)}
                    >
                      <IconText name="close-circle-outline" size={14} center textStyle={styles.actionDangerText}>Huỷ chuyến</IconText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionSecondary]}
                      onPress={() => navigation.navigate('Bookings', { tripId: t.id })}
                    >
                      <IconText name="format-list-bulleted" size={14} center textStyle={styles.actionSecondaryText}>Xem booking</IconText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary]}
                      onPress={() => doStartTrip(t)}
                    >
                      <IconText name="play" size={13} center textStyle={styles.actionPrimaryText}>Bắt đầu</IconText>
                    </TouchableOpacity>
                  </>
                )}
                {t.status === 'STARTED' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionDanger]}
                      onPress={() => doCancelTrip(t)}
                    >
                      <IconText name="close-circle-outline" size={14} center textStyle={styles.actionDangerText}>Huỷ chuyến</IconText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionSecondary]}
                      onPress={() => navigation.navigate('Bookings', { tripId: t.id })}
                    >
                      <IconText name="format-list-bulleted" size={14} center textStyle={styles.actionSecondaryText}>Xem booking</IconText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary]}
                      onPress={() => doCompleteTrip(t)}
                    >
                      <IconText name="check-circle-outline" size={14} center textStyle={styles.actionPrimaryText}>Kết thúc</IconText>
                    </TouchableOpacity>
                  </>
                )}
                {(t.status === 'COMPLETED' || t.status === 'CANCELED') && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionSecondary]}
                    onPress={() => navigation.navigate('Bookings', { tripId: t.id })}
                  >
                    <IconText name="format-list-bulleted" size={14} center textStyle={styles.actionSecondaryText}>Xem booking</IconText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
        </>
      )}
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
  actionMsg: { padding: 9, marginHorizontal: 12, marginBottom: 6, backgroundColor: colors.primaryFaintest, borderRadius: 6, fontSize: 11, color: colors.textDark },
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  kicker: { fontFamily: FONT[800], fontSize: 9, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 1.5 },
  title: { fontFamily: FONT[700], marginTop: 3, fontSize: 20, fontWeight: '700', color: colors.text },
  refreshBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { color: colors.primaryAccent, fontSize: 19, fontWeight: '700' },
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

  actions: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  actionPrimary: { backgroundColor: colors.primary },
  actionPrimaryText: { color: 'white', fontSize: 11, fontWeight: '700' },
  actionSecondary: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primaryAccent },
  actionSecondaryText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  actionDanger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca' },
  actionDangerText: { color: colors.danger, fontSize: 11, fontWeight: '700' },

  card: { marginBottom: 9, padding: 12, borderWidth: 1, borderColor: '#e3ece8', borderRadius: 10, backgroundColor: 'white', ...shadow(2, 0.07, 7) },
  complaintCard: { marginBottom: 9, padding: 13, borderWidth: 1, borderColor: '#e3ece8', borderRadius: 10, backgroundColor: 'white', ...shadow(2, 0.07, 7) },
  complaintCardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  complaintTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textDark },
  complaintStatus: { fontSize: 10, fontWeight: '700', color: colors.primaryAccent },
  complaintMeta: { marginTop: 5, fontSize: 11, color: colors.textSubtle },
  complaintDescription: { marginTop: 9, fontSize: 12, lineHeight: 18, color: colors.textDark },
  evidenceText: { marginTop: 6, fontSize: 11, color: colors.primaryAccent },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  tripSummary: { flex: 1, minWidth: 0 },
  tripRoute: { fontFamily: FONT[700], fontSize: 13, fontWeight: '700', color: colors.textDark },
  stopLine: { fontSize: 12, color: colors.textDark, marginTop: 3 },
  tripTime: { fontSize: 12, color: colors.textSubtle, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start', flexShrink: 0 },
  badgeText: { fontFamily: FONT[700], fontSize: 10, fontWeight: '700', textAlign: 'right' },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  metrics: { flexDirection: 'row', gap: 24 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, color: colors.textSubtle, marginBottom: 2 },
  metricValue: { fontFamily: FONT[700], fontSize: 12, fontWeight: '700' },
});
