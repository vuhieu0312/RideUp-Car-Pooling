import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, HelperText, IconButton, Portal, SegmentedButtons, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  approveDriver, approveVehicle, getDriverDetail, getLocationStats,
  listDrivers, listPendingVehicles, rejectDriver, rejectVehicle,
} from '../api/api';
import { useAuth } from '../auth/AuthContext';
import DetailModal from '../components/DetailModal';
import IconText from '../components/IconText';
import { Text } from '../components/Typography';
import Logo from '../components/Logo';
import { useRealtimeRefresh } from '../realtime/useRealtime';
import { DRIVER_STATUS, GENDER, label, VEHICLE_STATUS, VEHICLE_TYPE } from '../utils/labels';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, doLogout } = useAuth();
  const [tab, setTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null); // { type, id }
  const [rejectReason, setRejectReason] = useState('');
  const [detail, setDetail] = useState(null); // { type, item }

  async function loadDrivers(silent) {
    if (silent !== true) setLoading(true);
    try { setDrivers(await listDrivers('PENDING')); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
    finally { setLoading(false); }
  }

  async function loadVehicles(silent) {
    if (silent !== true) setLoading(true);
    try { setVehicles(await listPendingVehicles()); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
    finally { setLoading(false); }
  }

  async function loadStats() {
    setLoading(true);
    try { setStats(await getLocationStats()); }
    catch { setStats({ provinces: 0, wards: 0 }); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (tab === 'drivers') loadDrivers();
    else if (tab === 'vehicles') loadVehicles();
    else loadStats();
  }, [tab]);

  useRealtimeRefresh(() => {
    if (tab === 'drivers') loadDrivers(true);
    else if (tab === 'vehicles') loadVehicles(true);
  }, ['ADMIN_QUEUE_UPDATED']);

  async function approveD(id) {
    try { const x = await approveDriver(id); setMsg(x.message); loadDrivers(); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
  }

  async function approveV(id) {
    try { const x = await approveVehicle(id); setMsg(x.message); loadVehicles(); }
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
      if (rejectTarget.type === 'driver') loadDrivers(); else loadVehicles();
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  }

  const fmtDate = (s) => (s ? s.substring(0, 10) : '—');
  const fmtDateTime = (s) => (s ? s.substring(0, 16).replace('T', ' ') : '—');

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

  function approveFromDetail() {
    const { type, item } = detail;
    setDetail(null);
    if (type === 'driver') approveD(item.id); else approveV(item.id);
  }

  function rejectFromDetail() {
    const { type, item } = detail;
    setDetail(null);
    setRejectTarget({ type, id: item.id });
    setRejectReason('');
  }

  const info = detailInfo();

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <Logo size="sm" tag="ADMIN" />
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>Dashboard</Text>
          <Text variant="bodySmall" style={{ color: '#94a3b8' }}>{user?.user?.fullName || user?.user?.email || ''}</Text>
        </View>
        <IconButton icon="logout" onPress={doLogout} iconColor="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!!msg && (
          <HelperText type={msg.startsWith('Lỗi') ? 'error' : 'info'} visible>{msg}</HelperText>
        )}

        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'drivers', label: `Tài xế (${drivers.length})` },
            { value: 'vehicles', label: `Xe (${vehicles.length})` },
            { value: 'locations', label: 'Thống kê' },
          ]}
          style={{ marginBottom: 12 }}
        />

        {tab === 'drivers' && (loading ? <Text>Đang tải...</Text> :
          drivers.length === 0 ? (
            <Card><Card.Content><Text style={{ textAlign: 'center', color: '#6b7280' }}>Không có tài xế chờ duyệt.</Text></Card.Content></Card>
          ) : (
            drivers.map((d) => (
              <Card key={d.id} style={{ marginBottom: 8 }}>
                <Card.Content>
                  <Text style={{ fontWeight: '700' }}>{d.fullName}</Text>
                  <IconText name="email-outline" size={14} gap={5} variant="bodySmall">{d.email}</IconText>
                  <IconText name="phone-outline" size={14} gap={5} variant="bodySmall">{d.phone}</IconText>
                  <IconText name="card-account-details-outline" size={14} gap={5} variant="bodySmall">CCCD: {d.cccd} · GPLX: {d.gplx}</IconText>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>Ngày tạo: {fmtDate(d.createdAt)}</Text>
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => openDriverDetail(d)}>Chi tiết</Button>
                  <Button mode="contained" buttonColor="#10b981" onPress={() => approveD(d.id)}>Duyệt</Button>
                  <Button mode="outlined" textColor="#dc2626" onPress={() => { setRejectTarget({ type: 'driver', id: d.id }); setRejectReason(''); }}>
                    Từ chối
                  </Button>
                </Card.Actions>
              </Card>
            ))
          )
        )}

        {tab === 'vehicles' && (loading ? <Text>Đang tải...</Text> :
          vehicles.length === 0 ? (
            <Card><Card.Content><Text style={{ textAlign: 'center', color: '#6b7280' }}>Không có phương tiện chờ duyệt.</Text></Card.Content></Card>
          ) : (
            vehicles.map((v) => (
              <Card key={v.id} style={{ marginBottom: 8 }}>
                <Card.Content>
                  <IconText name="car-outline" size={16} color="#374151" textStyle={{ fontWeight: '700' }}>{v.plateNumber}</IconText>
                  <IconText name="account-outline" size={14} gap={5} variant="bodySmall">{v.driverName} · {v.driverPhone}</IconText>
                  <Text variant="bodySmall">{label(VEHICLE_TYPE, v.vehicleType)} · {v.seatCapacity} chỗ</Text>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>Hạn đăng kiểm: {fmtDate(v.registrationExpiryDate)}</Text>
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => setDetail({ type: 'vehicle', item: v })}>Chi tiết</Button>
                  <Button mode="contained" buttonColor="#10b981" onPress={() => approveV(v.id)}>Duyệt</Button>
                  <Button mode="outlined" textColor="#dc2626" onPress={() => { setRejectTarget({ type: 'vehicle', id: v.id }); setRejectReason(''); }}>
                    Từ chối
                  </Button>
                </Card.Actions>
              </Card>
            ))
          )
        )}

        {tab === 'locations' && (
          <Card><Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>Thống kê dữ liệu địa lý</Text>
            {stats ? (
              <>
                <Text variant="bodyMedium" style={{ marginTop: 8 }}>Tỉnh/thành: <Text style={{ fontWeight: '700' }}>{stats.provinces}</Text></Text>
                <Text variant="bodyMedium">Phường/xã: <Text style={{ fontWeight: '700' }}>{stats.wards}</Text></Text>
              </>
            ) : <Text>Đang tải...</Text>}
          </Card.Content></Card>
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
        onApprove={approveFromDetail}
        onReject={rejectFromDetail}
      />

      <Portal>
        <Dialog visible={!!rejectTarget} onDismiss={() => setRejectTarget(null)}>
          <Dialog.Title>Lý do từ chối</Dialog.Title>
          <Dialog.Content>
            <TextInput mode="outlined" label="Lý do" value={rejectReason}
              onChangeText={setRejectReason} multiline numberOfLines={3} />
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
  topBar: { backgroundColor: '#1e293b', padding: 16, paddingTop: 32, flexDirection: 'row', alignItems: 'center' },
  brand: { color: '#fff', letterSpacing: 2, fontWeight: '700' },
});