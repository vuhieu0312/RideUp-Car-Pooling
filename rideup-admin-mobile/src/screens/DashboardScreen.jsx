import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button, Card, Chip, Dialog, HelperText, IconButton, Portal, SegmentedButtons,
  Text, TextInput,
} from 'react-native-paper';
import {
  approveDriver, approveVehicle, getLocationStats,
  listDrivers, listPendingVehicles, rejectDriver, rejectVehicle,
} from '../api/api';
import { useAuth } from '../auth/AuthContext';

export default function DashboardScreen() {
  const { user, doLogout } = useAuth();
  const [tab, setTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null); // { type, id }
  const [rejectReason, setRejectReason] = useState('');

  async function loadDrivers() {
    setLoading(true);
    try { setDrivers(await listDrivers('PENDING')); }
    catch (e) { setMsg('❌ ' + (e.response?.data?.message || e.message)); }
    finally { setLoading(false); }
  }

  async function loadVehicles() {
    setLoading(true);
    try { setVehicles(await listPendingVehicles()); }
    catch (e) { setMsg('❌ ' + (e.response?.data?.message || e.message)); }
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

  async function approveD(id) {
    try { const x = await approveDriver(id); setMsg('✅ ' + x.message); loadDrivers(); }
    catch (e) { setMsg('❌ ' + (e.response?.data?.message || e.message)); }
  }

  async function approveV(id) {
    try { const x = await approveVehicle(id); setMsg('✅ ' + x.message); loadVehicles(); }
    catch (e) { setMsg('❌ ' + (e.response?.data?.message || e.message)); }
  }

  async function doReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      if (rejectTarget.type === 'driver') await rejectDriver(rejectTarget.id, rejectReason);
      else await rejectVehicle(rejectTarget.id, rejectReason);
      setMsg('✅ Đã từ chối');
      setRejectTarget(null);
      setRejectReason('');
      if (rejectTarget.type === 'driver') loadDrivers(); else loadVehicles();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    }
  }

  const fmtDate = (s) => (s ? s.substring(0, 10) : '—');

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text variant="labelLarge" style={styles.brand}>RIDEUP · ADMIN</Text>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>Dashboard</Text>
          <Text variant="bodySmall" style={{ color: '#94a3b8' }}>{user?.user?.fullName || user?.user?.email || ''}</Text>
        </View>
        <IconButton icon="logout" onPress={doLogout} iconColor="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!!msg && (
          <HelperText type={msg.startsWith('❌') ? 'error' : 'info'} visible>{msg}</HelperText>
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
                  <Text variant="bodySmall">📧 {d.email}</Text>
                  <Text variant="bodySmall">📞 {d.phone}</Text>
                  <Text variant="bodySmall">🪪 CCCD: {d.cccd} · GPLX: {d.gplx}</Text>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>Ngày tạo: {fmtDate(d.createdAt)}</Text>
                </Card.Content>
                <Card.Actions>
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
                  <Text style={{ fontWeight: '700' }}>🚗 {v.plateNumber}</Text>
                  <Text variant="bodySmall">👤 {v.driverName} ({v.driverId?.substring(0, 8)}...)</Text>
                  <Text variant="bodySmall">{v.vehicleType} · {v.seatCapacity} chỗ</Text>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>Hạn ĐK: {fmtDate(v.registrationExpiryDate)}</Text>
                </Card.Content>
                <Card.Actions>
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