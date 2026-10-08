import { useEffect, useState } from 'react';
import { DeviceEventEmitter, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { getDriverProfile, getDriverStatus } from '../api/api';

export default function DriverStatusScreen() {
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const s = await getDriverStatus();
        if (cancelled) return;
        setStatus(s);
        if (s.status === 'APPROVED') {
          DeviceEventEmitter.emit('rideup-driver-approved');
          return;
        }
        if (s.status !== 'APPROVED') {
          const p = await getDriverProfile();
          if (!cancelled) setProfile(p);
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();
    // Poll mỗi 10 giây — khi APPROVED, AppNavigator sẽ tự chuyển sang Home stack
    const interval = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" /></View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={{ fontWeight: '700' }}>Hồ sơ tài xế đang được xét duyệt</Text>

      {status?.status === 'PENDING' && (
        <View style={[styles.alert, { backgroundColor: '#fef3c7' }]}>
          <Text>⏳ Hồ sơ của bạn đang được admin xét duyệt. Trang này sẽ tự động cập nhật mỗi 10 giây.</Text>
        </View>
      )}

      {status?.status === 'REJECTED' && (
        <View style={[styles.alert, { backgroundColor: '#fee2e2' }]}>
          <Text>❌ Hồ sơ bị từ chối. Lý do: <Text style={{ fontWeight: '700' }}>{status.rejectionReason || 'Không có'}</Text></Text>
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