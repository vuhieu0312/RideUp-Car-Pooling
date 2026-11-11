import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deactivateVehicle, listMyVehicles, reuseVehicle } from '../api/api';
import { useDialog } from '../components/AppDialog';
import { useRealtimeRefresh } from '../realtime/useRealtime';
import IconText from '../components/IconText';
import { Text } from '../components/Typography';
import { FONT } from '../theme';
import { formatDate, VEHICLE_STATUS, vehicleTypeLabel } from '../utils/driverForm';

export default function VehicleListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  function load(silent) {
    if (silent !== true) setLoading(true);
    listMyVehicles().then(setVehicles).catch(() => setVehicles([])).finally(() => setLoading(false));
  }
  useEffect(() => navigation.addListener('focus', () => load()), [navigation]);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(t);
  }, [msg]);
  useRealtimeRefresh(() => load(true), ['VEHICLE_UPDATED']);

  const hasPending = vehicles.some((v) => v.status === 'PENDING');
  const hasActive = vehicles.some((v) => v.status === 'ACTIVE');

  function changeVehicle() {
    if (hasPending) {
      dialog.alert('Đang có xe chờ duyệt', 'Vui lòng đợi admin duyệt xe đang chờ trước khi đổi xe khác.');
      return;
    }
    navigation.navigate('VehicleRegister', { changing: vehicles.length > 0 });
  }

  async function runAction(confirm, action) {
    const ok = await dialog.confirm(confirm);
    if (!ok) return;
    try {
      const r = await action();
      setMsg(r.message || '');
      load();
    } catch (e) {
      dialog.alert('Không thực hiện được', e.response?.data?.message || 'Có lỗi xảy ra');
    }
  }

  function stopUsing(v) {
    runAction({
      title: 'Ngừng dùng xe',
      message: `Ngừng dùng xe ${v.plateNumber}? Bạn sẽ không tạo được chuyến mới cho tới khi có xe khác được duyệt.`,
      confirmText: 'Ngừng dùng',
      cancelText: 'Huỷ',
    }, () => deactivateVehicle(v.id));
  }

  function reuse(v) {
    if (hasPending) {
      dialog.alert('Đang có xe chờ duyệt', 'Vui lòng đợi admin duyệt xe đang chờ trước khi dùng lại xe khác.');
      return;
    }
    runAction({
      title: 'Dùng lại xe',
      message: `Gửi yêu cầu dùng lại xe ${v.plateNumber}? Admin duyệt xong, xe này sẽ thay xe đang dùng.`,
      confirmText: 'Gửi yêu cầu',
      cancelText: 'Huỷ',
    }, () => reuseVehicle(v.id));
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <IconText name="car-outline" size={20} variant="titleMedium" style={{ flex: 1 }} textStyle={{ fontWeight: '700' }}>Phương tiện của tôi</IconText>
        <Button icon="swap-horizontal" compact onPress={changeVehicle}>{vehicles.length ? 'Đổi xe' : 'Thêm xe'}</Button>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!!msg && <Text style={styles.msg}>{msg}</Text>}
        {!loading && vehicles.length > 0 && !hasActive && (
          <View style={[styles.box, { backgroundColor: '#fef3c7' }]}>
            <Text style={{ color: '#92400e' }}>Bạn chưa có xe đang dùng nên chưa tạo được chuyến. Hãy đổi xe hoặc chờ admin duyệt.</Text>
          </View>
        )}

        {loading ? (
          <Text style={{ textAlign: 'center', padding: 24 }}>Đang tải...</Text>
        ) : vehicles.length === 0 ? (
          <Card><Card.Content>
            <Text style={{ textAlign: 'center' }}>Bạn chưa đăng ký phương tiện nào.</Text>
            <Button mode="contained" onPress={changeVehicle} style={{ marginTop: 12 }}>Đăng ký xe ngay</Button>
          </Card.Content></Card>
        ) : vehicles.map((v) => {
          const st = VEHICLE_STATUS[v.status] || VEHICLE_STATUS.PENDING;
          return (
            <Card key={v.id} style={{ marginBottom: 8 }}>
              <Card.Content>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <IconText name="car-outline" size={16} color="#374151" textStyle={{ fontWeight: '700' }}>{v.plateNumber}</IconText>
                    <Text variant="bodySmall" style={styles.meta}>
                      {[v.vehicleBrand, v.vehicleModel, v.vehicleYear && `(${v.vehicleYear})`].filter(Boolean).join(' ') || '—'}
                    </Text>
                    <Text variant="bodySmall" style={styles.meta}>
                      {[v.vehicleColor, `${v.seatCapacity} chỗ`, vehicleTypeLabel(v.vehicleType)].filter(Boolean).join(' · ')}
                    </Text>
                    <Text variant="bodySmall" style={styles.meta}>Hạn đăng kiểm: {formatDate(v.registrationExpiryDate)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.color + '1A' }]}>
                    <MaterialCommunityIcons name={st.icon} size={12} color={st.color} />
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                {v.status === 'ACTIVE' && (
                  <View style={[styles.box, { backgroundColor: '#dcfce7' }]}>
                    <IconText name="check-circle-outline" size={16} color="#166534" textStyle={{ color: '#166534' }}>Xe đang dùng để tạo chuyến.</IconText>
                    <Button mode="outlined" icon="pause-circle-outline" textColor="#6b7280" style={{ marginTop: 8 }} onPress={() => stopUsing(v)}>
                      Ngừng dùng (xe hỏng)
                    </Button>
                  </View>
                )}
                {v.status === 'PENDING' && (
                  <View style={[styles.box, { backgroundColor: '#fef3c7' }]}>
                    <Text style={{ color: '#92400e' }}>Đang chờ admin duyệt. Sau khi duyệt, xe này sẽ thay xe đang dùng.</Text>
                  </View>
                )}
                {v.status === 'REJECTED' && (
                  <View style={[styles.box, { backgroundColor: '#fee2e2' }]}>
                    <Text style={{ color: '#991b1b' }}>Lý do từ chối: {v.rejectionReason || 'Không có'}</Text>
                    <Button mode="contained" icon="pencil-outline" style={{ marginTop: 8 }}
                      onPress={() => navigation.navigate('VehicleRegister', { vehicle: v })}>
                      Sửa và gửi lại
                    </Button>
                  </View>
                )}
                {v.status === 'INACTIVE' && (
                  <View style={[styles.box, { backgroundColor: '#f3f4f6' }]}>
                    <Text style={{ color: '#374151' }}>Xe đã ngừng dùng. Các chuyến cũ của xe vẫn được giữ nguyên.</Text>
                    <Button mode="outlined" icon="restore" style={{ marginTop: 8 }} onPress={() => reuse(v)}>
                      Dùng lại xe này
                    </Button>
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: '#6b7280' },
  box: { padding: 10, borderRadius: 6, marginTop: 8 },
  msg: { color: '#166534', marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginLeft: 8 },
  badgeText: { fontSize: 11, marginLeft: 4, fontFamily: FONT[600] },
});
