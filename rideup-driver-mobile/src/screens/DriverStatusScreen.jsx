import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDriverProfile, getDriverStatus } from '../api/api';
import IconText from '../components/IconText';
import { Text } from '../components/Typography';
import { useRealtimeRefresh } from '../realtime/useRealtime';

export default function DriverStatusScreen() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const aliveRef = useRef(true);

  const check = useCallback(async () => {
    try {
      const s = await getDriverStatus();
      if (!aliveRef.current) return;
      setStatus(s);
      if (s.status === 'APPROVED') {
        // AppNavigator lắng nghe sự kiện này để chuyển sang màn hình chính
        DeviceEventEmitter.emit('rideup-driver-approved');
        return;
      }
      const p = await getDriverProfile();
      if (aliveRef.current) setProfile(p);
    } catch (e) {
      // ignore
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    check();
    return () => { aliveRef.current = false; };
  }, [check]);

  // Admin duyệt / từ chối hồ sơ hoặc xe → server đẩy về ngay (mất kết nối thì tự hỏi lại mỗi 30 giây)
  useRealtimeRefresh(check, ['DRIVER_PROFILE_UPDATED', 'VEHICLE_UPDATED']);

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" /></View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text variant="headlineSmall" style={{ fontWeight: '700' }}>Hồ sơ tài xế đang được xét duyệt</Text>

      {status?.status === 'PENDING' && (
        <View style={[styles.alert, { backgroundColor: '#fef3c7' }]}>
          <IconText name="clock-outline" size={18} color="#92400e">Hồ sơ của bạn đang được admin xét duyệt. Trang này sẽ tự động cập nhật khi có kết quả.</IconText>
        </View>
      )}

      {status?.status === 'REJECTED' && (
        <View style={[styles.alert, { backgroundColor: '#fee2e2' }]}>
          <IconText name="close-circle-outline" size={18} color="#991b1b">Hồ sơ bị từ chối. Lý do: <Text style={{ fontWeight: '700' }}>{status.rejectionReason || 'Không có'}</Text></IconText>
        </View>
      )}

      {profile && (
        <View style={styles.card}>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8 }}>Thông tin hồ sơ</Text>
          <Field label="Trạng thái" value={profile.status} />
          <Field label="Họ tên" value={profile.fullName} />
          <Field label="CCCD" value={profile.cccd} />
          <Field label="GPLX" value={profile.gplx} />
          <Field label="Hết hạn GPLX" value={profile.gplxExpiryDate} />
          <Field label="SĐT" value={profile.phone} />
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
      <Text style={{ width: 130, color: '#6b7280' }}>{label}:</Text>
      <Text style={{ flex: 1, fontWeight: '600' }}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f9fafb', flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  alert: { padding: 12, borderRadius: 8, marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, elevation: 1 },
});