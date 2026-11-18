import { useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Card, Checkbox, Dialog, HelperText, IconButton, Portal, SegmentedButtons, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  approveDriver, approveVehicle, bulkReviewReports, getAdminDashboardStats, getDriverDetail, getLocationStats,
  listDrivers, listPendingVehicles, listReports, rejectDriver, rejectVehicle, reviewReport,
} from '../api/api';
import { useAuth } from '../auth/AuthContext';
import AuthImage from '../components/AuthImage';
import DetailModal from '../components/DetailModal';
import IconText from '../components/IconText';
import { Text } from '../components/Typography';
import Logo from '../components/Logo';
import { useRealtimeRefresh } from '../realtime/useRealtime';
import { DRIVER_STATUS, GENDER, label, VEHICLE_STATUS, VEHICLE_TYPE } from '../utils/labels';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, doLogout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [reports, setReports] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [locationStats, setLocationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detail, setDetail] = useState(null);
  const [selectedReports, setSelectedReports] = useState([]);

  const fmtDate = (value) => value ? value.substring(0, 10) : '—';
  const fmtDateTime = (value) => value ? value.substring(0, 16).replace('T', ' ') : '—';
  const fmtVnd = (value) => {
    const number = Number(value || 0);
    if (number >= 1000000000) return `${(number / 1000000000).toFixed(1)} tỷ`;
    if (number >= 1000000) return `${(number / 1000000).toFixed(1)} triệu`;
    return `${Math.round(number).toLocaleString('vi-VN')} đ`;
  };

  async function loadAll() {
    setLoading(true);
    try {
      const [stats, pendingDrivers, pendingVehicles, allReports, locations] = await Promise.all([
        getAdminDashboardStats(), listDrivers('PENDING'), listPendingVehicles(),
        listReports(null), getLocationStats(),
      ]);
      setDashboard(stats);
      setDrivers(pendingDrivers);
      setVehicles(pendingVehicles);
      setReports(allReports);
      setLocationStats(locations);
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  useRealtimeRefresh(() => {
    if (tab === 'management') loadAll();
  }, ['ADMIN_QUEUE_UPDATED']);

  async function handleReport(id, status) {
    try {
      const result = await reviewReport(id, status);
      setMsg(status === 'APPROVED' && result.data?.accountStatus === 'LOCKED'
        ? 'Đã duyệt; tài khoản người dùng đã bị khóa' : result.message);
      await loadAll();
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  }

  async function handleBulk(status) {
    if (!selectedReports.length) return;
    try {
      await bulkReviewReports(selectedReports, status);
      setMsg(`Đã xử lý ${selectedReports.length} khiếu nại`);
      setSelectedReports([]);
      await loadAll();
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  }

  async function openEvidence(url) {
    try { await Linking.openURL(url); }
    catch (e) { setMsg('Không thể mở bằng chứng: ' + e.message); }
  }

  async function approveD(id) {
    try { const x = await approveDriver(id); setMsg(x.message); await loadAll(); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
  }

  async function approveV(id) {
    try { const x = await approveVehicle(id); setMsg(x.message); await loadAll(); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
  }

  async function doReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      if (rejectTarget.type === 'driver') await rejectDriver(rejectTarget.id, rejectReason);
      else await rejectVehicle(rejectTarget.id, rejectReason);
      setMsg('Đã từ chối');
      setRejectTarget(null);
      setRejectReason('');
      await loadAll();
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  }

  async function openDriverDetail(d) {
    try { setDetail({ type: 'driver', item: d, data: await getDriverDetail(d.id) }); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
  }

  function reviewHistory(item, reviewerName) {
    if (item.approvedAt) return `Duyệt bởi ${reviewerName || 'admin'} lúc ${fmtDateTime(item.approvedAt)}`;
    if (item.rejectedAt && item.status === 'PENDING') return `Gửi lại sau khi bị từ chối lúc ${fmtDateTime(item.rejectedAt)}: ${item.rejectionReason || ''}`;
    if (item.rejectedAt) return `Từ chối lúc ${fmtDateTime(item.rejectedAt)}: ${item.rejectionReason || ''}`;
    if (item.rejectionReason) return `Lần trước bị từ chối: ${item.rejectionReason}`;
    return 'Chưa xử lý';
  }

  function detailInfo() {
    if (!detail) return { title: '', rows: [], images: [] };
    const x = detail.item;
    if (detail.type === 'driver') {
      const d = detail.data?.driver || x;
      const v = detail.data?.vehicle;
      const sections = [
        {
          title: 'Tài khoản',
          rows: [
            ['Họ tên', d.fullName], ['Email', d.email], ['Số điện thoại', d.phone],
            ['Ngày sinh', fmtDate(d.dateOfBirth)], ['Giới tính', label(GENDER, d.gender)],
            ['Ngày tạo tài khoản', fmtDate(detail.data?.accountCreatedAt)],
          ],
        },
        {
          title: 'Giấy tờ',
          rows: [
            ['CCCD', d.cccd], ['GPLX', d.gplx], ['Hạn GPLX', fmtDate(d.gplxExpiryDate)],
            ['Trạng thái', label(DRIVER_STATUS, d.status)], ['Ngày nộp hồ sơ', fmtDate(d.createdAt)],
            ['Lịch sử duyệt', reviewHistory(d, detail.data?.driverReviewedByName)],
          ],
        },
        {
          title: 'Phương tiện',
          rows: v ? [
            ['Biển số', v.plateNumber], ['Hãng / dòng', [v.vehicleBrand, v.vehicleModel].filter(Boolean).join(' ')],
            ['Năm sản xuất', v.vehicleYear], ['Màu sắc', v.vehicleColor], ['Loại xe', label(VEHICLE_TYPE, v.vehicleType)],
            ['Số chỗ', v.seatCapacity], ['Hạn đăng kiểm', fmtDate(v.registrationExpiryDate)],
            ['Trạng thái xe', label(VEHICLE_STATUS, v.status)],
            ['Lịch sử duyệt xe', reviewHistory(v, detail.data?.vehicleReviewedByName)],
          ] : [['Phương tiện', 'Chưa đăng ký']],
        },
      ];
      const allVehicles = detail.data?.vehicles || [];
      if (allVehicles.length > 1) {
        sections.push({
          title: 'Lịch sử xe',
          rows: allVehicles.map((x) => [x.plateNumber, `${label(VEHICLE_STATUS, x.status)} · đăng ký ${fmtDate(x.createdAt)}`]),
        });
      }
      const imageGroups = [
        {
          title: 'Giấy tờ tài xế',
          images: [
            { label: 'CCCD mặt trước', path: d.cccdImageFront },
            { label: 'CCCD mặt sau', path: d.cccdImageBack },
            { label: 'Giấy phép lái xe', path: d.gplxImage },
          ],
        },
      ];
      if (v) {
        imageGroups.push({
          title: 'Phương tiện',
          images: [
            { label: 'Ảnh xe', path: v.vehicleImage },
            { label: 'Giấy đăng ký xe', path: v.registrationImage },
          ],
        });
      }
      return {
        title: 'Hồ sơ tài xế',
        sections,
        imageGroups,
        warnings: detail.data?.warnings || [],
      };
    }
    return {
      title: 'Hồ sơ phương tiện',
      rows: [
        ['Biển số', x.plateNumber], ['Tài xế', x.driverName], ['SĐT tài xế', x.driverPhone], ['Hãng xe', x.vehicleBrand],
        ['Dòng xe', x.vehicleModel], ['Năm sản xuất', x.vehicleYear], ['Màu sắc', x.vehicleColor],
        ['Loại xe', label(VEHICLE_TYPE, x.vehicleType)], ['Số chỗ', x.seatCapacity],
        ['Hạn đăng kiểm', fmtDate(x.registrationExpiryDate)],
        ['Ngày đăng ký', fmtDate(x.createdAt)],
      ],
      images: [
        { label: 'Ảnh xe', path: x.vehicleImage },
        { label: 'Giấy đăng ký xe', path: x.registrationImage },
      ],
    };
  }

  function Metric({ icon, label, value, color = '#2563eb', detail: subtext }) {
    return (
      <Card style={styles.metric} mode="elevated">
        <Card.Content style={{ padding: 14 }}>
          <IconButton icon={icon} iconColor={color} style={{ backgroundColor: color + '18', margin: 0 }} size={20} />
          <Text variant="bodySmall" style={styles.metricLabel}>{label}</Text>
          <Text variant="headlineSmall" style={{ color: '#0f172a', fontWeight: '800' }}>{value}</Text>
          {!!subtext && <Text variant="bodySmall" style={{ color: '#64748b', marginTop: 2 }}>{subtext}</Text>}
        </Card.Content>
      </Card>
    );
  }

  function BarChart({ data, color = '#2563eb', suffix = '' }) {
    const [selectedDate, setSelectedDate] = useState(null);
    const { width: screenWidth } = useWindowDimensions();
    const monthLabels = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
    let visible;

    if (period === 'day') {
      visible = data.slice(-1).map((item) => ({ ...item, key: item.date, label: 'Hôm nay' }));
    } else if (period === 'week') {
      visible = data.slice(-7).map((item) => ({
        ...item,
        key: item.date,
        label: item.date ? item.date.substring(8, 10) + '/' + item.date.substring(5, 7) : '',
      }));
    } else if (period === 'year') {
      const months = new Map();
      const today = new Date();
      for (let offset = 11; offset >= 0; offset -= 1) {
        const month = new Date(today.getFullYear(), today.getMonth() - offset, 1);
        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        months.set(key, { date: key, key, label: monthLabels[month.getMonth()], value: 0 });
      }
      data.forEach((item) => {
        const month = months.get(item.date?.substring(0, 7));
        if (month) month.value += Number(item.value || 0);
      });
      visible = Array.from(months.values());
    } else {
      visible = data.slice(-30).map((item) => ({
        ...item,
        key: item.date,
        label: item.date ? item.date.substring(8, 10) + '/' + item.date.substring(5, 7) : '',
      }));
    }

    const max = Math.max(1, ...visible.map((item) => Number(item.value || 0)));
    const chartWidth = Math.max(0, screenWidth - 64);
    const contentWidth = Math.max(chartWidth, visible.length * 36);
    const selected = visible.find((item) => item.key === selectedDate);
    const selectedLabel = selected?.date?.length === 7
      ? `${selected.date.substring(5, 7)}/${selected.date.substring(0, 4)}`
      : selected?.date
        ? `${selected.date.substring(8, 10)}/${selected.date.substring(5, 7)}/${selected.date.substring(0, 4)}`
        : '';

    if (!visible.length) return <Text style={styles.emptyText}>Chưa có dữ liệu biểu đồ</Text>;

    return (
      <View>
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={visible.length * 36 > chartWidth}>
          <View style={[styles.chart, { width: contentWidth }]}>
            {visible.map((item, index) => (
              <Pressable
                key={item.key || index}
                accessibilityRole="button"
                accessibilityLabel={`${item.date || ''}: ${Number(item.value || 0).toLocaleString('vi-VN')}${suffix}`}
                onHoverIn={() => setSelectedDate(item.key)}
                onPress={() => setSelectedDate(item.key)}
                style={[styles.barColumn, { width: contentWidth / visible.length }]}
              >
                <View style={[
                  styles.bar,
                  {
                    height: Math.max(4, Number(item.value || 0) / max * 110),
                    backgroundColor: color,
                    opacity: selectedDate === item.key ? 1 : 0.8,
                  },
                ]} />
                <Text variant="bodySmall" style={styles.barLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {!!selected && (
          <Text variant="bodySmall" style={styles.chartValue}>
            {selectedLabel} · {Number(selected.value || 0).toLocaleString('vi-VN')}{suffix}
          </Text>
        )}
      </View>
    );
  }

  const info = detailInfo();
  const tripTimeline = dashboard?.trips?.timeline || [];
  const revenueTimeline = dashboard?.revenue?.timeline || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f6fb' }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={{ flex: 1 }}>
          <Logo size="sm" tag="ADMIN" />
          <Text variant="titleLarge" style={{ color: '#fff', fontWeight: '800' }}>Trung tâm điều hành</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="bodySmall" style={{ color: '#cbd5e1' }}>{user?.fullName || user?.email || 'Quản trị viên'}</Text>
          <IconButton icon="logout" onPress={doLogout} iconColor="#fff" size={20} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} />}
      >
        {!!msg && <HelperText type={msg.startsWith('Lỗi') ? 'error' : 'info'} visible>{msg}</HelperText>}

        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              ['overview', 'Tổng quan'], ['trips', 'Chuyến & doanh thu'],
              ['people', 'Tài xế & khách'], ['reports', 'Khiếu nại'], ['management', 'Quản lý'],
            ].map(([value, label]) => (
              <Button key={value} compact mode={tab === value ? 'contained' : 'outlined'}
                buttonColor={tab === value ? '#2563eb' : undefined} textColor={tab === value ? '#fff' : '#64748b'}
                style={{ marginRight: 8, borderRadius: 20 }} onPress={() => setTab(value)}>{label}</Button>
            ))}
          </ScrollView>
        </View>

        {loading && !dashboard ? <Text>Đang tải dữ liệu...</Text> : (
          <>
            {tab === 'overview' && dashboard && (
              <>
                <SegmentedButtons value={period} onValueChange={setPeriod}
                  buttons={[
                    { value: 'day', label: 'Ngày' },
                    { value: 'week', label: 'Tuần' },
                    { value: 'month', label: 'Tháng' },
                    { value: 'year', label: 'Năm' },
                  ]}
                  style={{ marginBottom: 12 }} />
                <View style={styles.metricGrid}>
                  <Metric icon="account-group" label="Người dùng" value={dashboard.totalUsers} color="#2563eb" detail="Tài xế và khách hàng" />
                  <Metric icon="car-multiple" label="Chuyến đi" value={dashboard.totalTrips} color="#7c3aed" detail={`${dashboard.trips?.completed || 0} hoàn thành`} />
                  <Metric icon="cash-multiple" label="Doanh thu" value={fmtVnd(dashboard.totalRevenue)} color="#059669" />
                  <Metric icon="alert-circle-outline" label="Khiếu nại" value={dashboard.reports?.total || 0} color="#dc2626" detail="Tổng hồ sơ" />
                </View>
                <Card style={styles.card}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.cardTitle}>Doanh thu theo thời gian</Text>
                    <BarChart data={revenueTimeline} color="#10b981" suffix=" đ" />
                  </Card.Content>
                </Card>
                <Card style={styles.card}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.cardTitle}>Số chuyến theo thời gian</Text>
                    <BarChart data={tripTimeline} color="#6366f1" />
                  </Card.Content>
                </Card>
                <View style={styles.metricGrid}>
                  <Metric icon="map-marker-outline" label="Tỉnh/thành" value={locationStats?.provinces || 0} color="#0891b2" />
                  <Metric icon="home-map-marker" label="Phường/xã" value={locationStats?.wards || 0} color="#ea580c" />
                </View>
              </>
            )}

            {tab === 'trips' && dashboard && (
              <>
                <View style={styles.metricGrid}>
                  <Metric icon="routes" label="Tổng chuyến" value={dashboard.trips?.total || 0} color="#2563eb" />
                  <Metric icon="check-circle-outline" label="Hoàn thành" value={dashboard.trips?.completed || 0} color="#10b981" />
                  <Metric icon="close-circle-outline" label="Đã hủy" value={dashboard.trips?.canceled || 0} color="#ef4444" />
                  <Metric icon="percent" label="Phí nền tảng" value={fmtVnd(dashboard.platformFee)} color="#f59e0b" />
                </View>
                <Card style={styles.card}><Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>Thống kê chuyến theo thời gian</Text>
                  <BarChart data={tripTimeline} color="#6366f1" />
                </Card.Content></Card>
                <Card style={styles.card}><Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>Doanh thu theo tài xế</Text>
                  {(dashboard.revenue?.byDriver || []).map((row, i) => (
                    <View key={row.name} style={styles.rankRow}>
                      <Text style={styles.rank}>#{i + 1}</Text><Text style={{ flex: 1, fontWeight: '700' }}>{row.name}</Text>
                      <Text style={{ color: '#059669', fontWeight: '800' }}>{fmtVnd(row.value)}</Text>
                    </View>
                  ))}
                  {!(dashboard.revenue?.byDriver || []).length && <Text style={styles.emptyText}>Chưa có doanh thu</Text>}
                </Card.Content></Card>
                <Card style={styles.card}><Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>Doanh thu theo thời gian</Text>
                  <Text variant="headlineSmall" style={{ color: '#059669', fontWeight: '800' }}>{fmtVnd(dashboard.revenue?.total)}</Text>
                  <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 8 }}>Phí nền tảng: {fmtVnd(dashboard.revenue?.platformFee)}</Text>
                  <BarChart data={revenueTimeline} color="#10b981" suffix=" đ" />
                </Card.Content></Card>
              </>
            )}

            {tab === 'people' && dashboard && (
              <>
                <View style={styles.metricGrid}>
                  <Metric icon="steering" label="Tài xế" value={dashboard.drivers?.total || 0} color="#2563eb" detail={`${dashboard.drivers?.newDrivers || 0} tài xế mới`} />
                  <Metric icon="account-check-outline" label="Tài xế hoạt động" value={dashboard.drivers?.activeDrivers || 0} color="#10b981" />
                  <Metric icon="account-outline" label="Khách hàng" value={dashboard.customers?.total || 0} color="#7c3aed" detail={`${dashboard.customers?.newCustomers || 0} khách mới`} />
                  <Metric icon="account-check-outline" label="Khách hoạt động" value={dashboard.customers?.activeCustomers || 0} color="#10b981" />
                </View>
                <Card style={styles.card}><Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>Top tài xế hoạt động</Text>
                  {(dashboard.drivers?.topActive || []).map((row, i) => (
                    <View key={row.name} style={styles.rankRow}><Text style={styles.rank}>#{i + 1}</Text><Text style={{ flex: 1, fontWeight: '700' }}>{row.name}</Text><Text>{row.trips} chuyến</Text></View>
                  ))}
                  {!(dashboard.drivers?.topActive || []).length && <Text style={styles.emptyText}>Chưa có dữ liệu</Text>}
                </Card.Content></Card>
                <Card style={styles.card}><Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>Top khách đặt chuyến</Text>
                  {(dashboard.customers?.topCustomers || []).map((row, i) => (
                    <View key={row.name} style={styles.rankRow}><Text style={styles.rank}>#{i + 1}</Text><Text style={{ flex: 1, fontWeight: '700' }}>{row.name}</Text><Text>{row.trips} chuyến</Text></View>
                  ))}
                  {!(dashboard.customers?.topCustomers || []).length && <Text style={styles.emptyText}>Chưa có dữ liệu</Text>}
                </Card.Content></Card>
              </>
            )}

            {tab === 'reports' && dashboard && (
              <>
                <View style={styles.metricGrid}>
                  <Metric icon="alert-outline" label="Tổng khiếu nại" value={dashboard.reports?.total || 0} color="#dc2626" />
                  <Metric icon="clock-outline" label="Chờ xử lý" value={dashboard.reports?.byStatus?.PENDING || 0} color="#f59e0b" />
                  <Metric icon="account-outline" label="Theo khách" value={dashboard.reports?.byTarget?.CUSTOMER || 0} color="#2563eb" />
                  <Metric icon="steering" label="Theo tài xế" value={dashboard.reports?.byTarget?.DRIVER || 0} color="#7c3aed" />
                </View>
                <Card style={styles.card}><Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>Trạng thái xử lý</Text>
                  {Object.entries(dashboard.reports?.byStatus || {}).map(([status, value]) => (
                    <View key={status} style={styles.rankRow}><Text style={{ flex: 1 }}>{status}</Text><Text style={{ fontWeight: '800' }}>{value}</Text></View>
                  ))}
                </Card.Content></Card>
                {selectedReports.length > 0 && (
                  <Card style={[styles.card, { backgroundColor: '#eff6ff' }]}><Card.Content>
                    <Text style={{ marginBottom: 8, fontWeight: '700' }}>Đã chọn {selectedReports.length} khiếu nại</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <Button compact mode="outlined" textColor="#dc2626" onPress={() => handleBulk('REJECTED')} style={{ marginRight: 8 }}>Từ chối hàng loạt</Button>
                      <Button compact mode="contained" buttonColor="#10b981" onPress={() => handleBulk('APPROVED')}>Duyệt hàng loạt</Button>
                    </View>
                  </Card.Content></Card>
                )}
                {reports.map((report) => (
                  <Card key={report.id} style={{ marginBottom: 8 }}>
                    <Card.Content>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        {report.status === 'PENDING' && <Checkbox status={selectedReports.includes(report.id) ? 'checked' : 'unchecked'} onPress={() => setSelectedReports((old) => old.includes(report.id) ? old.filter((id) => id !== report.id) : [...old, report.id])} />}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '800' }}>{report.title}</Text>
                          <Text variant="bodySmall">{report.category} · {report.bookingCode}</Text>
                          <Text variant="bodySmall">Người gửi: {report.reporterName}</Text>
                          <Text variant="bodySmall">Bị khiếu nại: {report.reportedUserName}</Text>
                          <Text variant="bodySmall">Vi phạm đã xác nhận: {report.violationCount}</Text>
                          <Text variant="bodySmall" style={{ marginTop: 5 }}>{report.description}</Text>
                          {!!report.evidenceUrl && (
                            <View style={{ marginTop: 8 }}>
                              <AuthImage path={report.evidenceUrl} label="Ảnh bằng chứng" />
                              <Button compact onPress={() => openEvidence(report.evidenceUrl)}>Mở bằng chứng</Button>
                            </View>
                          )}
                        </View>
                      </View>
                    </Card.Content>
                    {report.status === 'PENDING' && <Card.Actions>
                      <Button textColor="#dc2626" onPress={() => handleReport(report.id, 'REJECTED')}>Từ chối</Button>
                      <Button mode="contained" buttonColor="#10b981" onPress={() => handleReport(report.id, 'APPROVED')}>Duyệt</Button>
                    </Card.Actions>}
                  </Card>
                ))}
              </>
            )}

            {tab === 'management' && (
              <>
                <Text variant="titleMedium" style={styles.sectionTitle}>Tài xế chờ duyệt ({drivers.length})</Text>
                {drivers.map((d) => (
                  <Card key={d.id} style={{ marginBottom: 8 }}><Card.Content>
                    <Text style={{ fontWeight: '800' }}>{d.fullName}</Text>
                    <IconText name="email-outline" size={14} gap={5} variant="bodySmall">{d.email}</IconText>
                    <IconText name="phone-outline" size={14} gap={5} variant="bodySmall">{d.phone}</IconText>
                    <IconText name="card-account-details-outline" size={14} gap={5} variant="bodySmall">CCCD: {d.cccd} · GPLX: {d.gplx}</IconText>
                    <Text variant="bodySmall" style={{ color: '#64748b' }}>Ngày tạo: {fmtDate(d.createdAt)}</Text>
                  </Card.Content><Card.Actions>
                    <Button onPress={() => openDriverDetail(d)}>Chi tiết</Button>
                    <Button mode="contained" buttonColor="#10b981" onPress={() => approveD(d.id)}>Duyệt</Button>
                    <Button textColor="#dc2626" onPress={() => { setRejectTarget({ type: 'driver', id: d.id }); setRejectReason(''); }}>Từ chối</Button>
                  </Card.Actions></Card>
                ))}
                {!drivers.length && <Card style={styles.card}><Card.Content><Text style={styles.emptyText}>Không có tài xế chờ duyệt</Text></Card.Content></Card>}
                <Text variant="titleMedium" style={styles.sectionTitle}>Phương tiện chờ duyệt ({vehicles.length})</Text>
                {vehicles.map((v) => (
                  <Card key={v.id} style={{ marginBottom: 8 }}><Card.Content>
                    <IconText name="car-outline" size={16} textStyle={{ fontWeight: '800' }}>{v.plateNumber}</IconText>
                    <IconText name="account-outline" size={14} gap={5} variant="bodySmall">{v.driverName} · {v.driverPhone}</IconText>
                    <Text variant="bodySmall">{label(VEHICLE_TYPE, v.vehicleType)} · {v.seatCapacity} chỗ</Text>
                    <Text variant="bodySmall" style={{ color: '#64748b' }}>Hạn đăng kiểm: {fmtDate(v.registrationExpiryDate)}</Text>
                  </Card.Content><Card.Actions>
                    <Button onPress={() => setDetail({ type: 'vehicle', item: v })}>Chi tiết</Button>
                    <Button mode="contained" buttonColor="#10b981" onPress={() => approveV(v.id)}>Duyệt</Button>
                    <Button textColor="#dc2626" onPress={() => { setRejectTarget({ type: 'vehicle', id: v.id }); setRejectReason(''); }}>Từ chối</Button>
                  </Card.Actions></Card>
                ))}
                {!vehicles.length && <Card style={styles.card}><Card.Content><Text style={styles.emptyText}>Không có phương tiện chờ duyệt</Text></Card.Content></Card>}
              </>
            )}
          </>
        )}
      </ScrollView>

      <DetailModal
        visible={!!detail}
        title={info.title}
        rows={info.rows}
        sections={info.sections}
        images={info.images}
        imageGroups={info.imageGroups}
        warnings={info.warnings}
        onClose={() => setDetail(null)}
        onApprove={() => { const old = detail; setDetail(null); old?.type === 'driver' ? approveD(old.item.id) : approveV(old.item.id); }}
        onReject={() => { const old = detail; setDetail(null); setRejectTarget({ type: old.type, id: old.item.id }); setRejectReason(''); }} />

      <Portal>
        <Dialog visible={!!rejectTarget} onDismiss={() => setRejectTarget(null)}>
          <Dialog.Title>Lý do từ chối</Dialog.Title>
          <Dialog.Content>
            <TextInput mode="outlined" label="Lý do" value={rejectReason} onChangeText={setRejectReason} multiline numberOfLines={3} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectTarget(null)}>Huỷ</Button>
            <Button mode="contained" buttonColor="#dc2626" onPress={doReject}>Từ chối</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { backgroundColor: '#172033', paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  metric: { width: '48%', margin: '1%', borderRadius: 16, backgroundColor: '#fff' },
  metricLabel: { color: '#64748b', marginTop: 8 },
  card: { marginBottom: 10, borderRadius: 16, backgroundColor: '#fff' },
  cardTitle: { fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  chart: { height: 140, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  barColumn: { alignItems: 'center', justifyContent: 'flex-end', height: 140, paddingHorizontal: 2 },
  bar: { width: 16, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  barLabel: { height: 18, fontSize: 9, color: '#64748b', marginTop: 3, textAlign: 'center' },
  chartValue: { color: '#334155', fontWeight: '700', textAlign: 'center', marginTop: 8 },
  rankRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rank: { width: 38, color: '#2563eb', fontWeight: '800' },
  sectionTitle: { fontWeight: '800', marginVertical: 10 },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 12 },
});
