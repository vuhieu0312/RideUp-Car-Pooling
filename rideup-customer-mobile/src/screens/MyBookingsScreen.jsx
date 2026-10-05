import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button, Card, Chip, Dialog, Divider, HelperText, IconButton, Portal, Text,
} from 'react-native-paper';
import { cancelBooking, listMyBookings } from '../api/api';

const STATUS_MAP = {
  PENDING: { color: '#f59e0b', label: '⏳ Chờ tài xế duyệt' },
  CONFIRMED: { color: '#10b981', label: '✅ Đã xác nhận' },
  COMPLETED: { color: '#10b981', label: '✔️ Hoàn thành' },
  CANCELLED_USER: { color: '#dc2626', label: '✖️ Đã huỷ' },
  CANCELLED_PAYMENT_FAILED: { color: '#dc2626', label: '✖️ Huỷ (thanh toán lỗi)' },
  EXPIRED: { color: '#dc2626', label: '⌛ Hết hạn' },
};

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang đặt' },
  { key: 'COMPLETED', label: 'Đã xong' },
  { key: 'CANCELED', label: 'Đã hủy' },
];

export default function MyBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  function load() {
    setLoading(true);
    listMyBookings()
      .then(setBookings)
      .catch((e) => setError(e.response?.data?.message || 'Lỗi tải booking'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  function matchesFilter(b) {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return b.status === 'PENDING' || b.status === 'CONFIRMED';
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    return ['CANCELLED_USER', 'CANCELLED_PAYMENT_FAILED', 'EXPIRED'].includes(b.status);
  }

  async function doCancel() {
    if (!cancelTarget) return;
    try {
      await cancelBooking(cancelTarget.id, 'Khách hủy từ app');
      setActionMsg('✅ Đã huỷ booking');
      setCancelTarget(null);
      load();
    } catch (e) {
      setActionMsg(`❌ ${e.response?.data?.message || 'Lỗi huỷ'}`);
    }
  }

  const visible = bookings.filter(matchesFilter);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1 }}>Chuyến xe của tôi</Text>
        <IconButton icon="refresh" onPress={load} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} selected={filter === f.key} onPress={() => setFilter(f.key)}
              style={{ marginRight: 8 }} mode="outlined">
              {f.label}
            </Chip>
          ))}
        </ScrollView>

        {!!error && <HelperText type="error" visible>{error}</HelperText>}
        {!!actionMsg && <HelperText type="info" visible>{actionMsg}</HelperText>}

        {loading ? (
          <Text>Đang tải...</Text>
        ) : bookings.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#6b7280' }}>Bạn chưa có booking nào.</Text>
            <Button mode="contained" onPress={() => navigation.navigate('Home')} style={{ marginTop: 12 }}>
              Tìm chuyến ngay
            </Button>
          </View>
        ) : visible.length === 0 ? (
          <Text style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>
            Không có chuyến xe trong nhóm này.
          </Text>
        ) : (
          visible.map((b) => {
            const meta = STATUS_MAP[b.status] || { color: '#6b7280', label: b.status };
            const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED';
            return (
              <Card key={b.id} style={{ marginBottom: 12 }}>
                <Card.Content>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall" style={styles.subtitle}>Mã: {b.bookingCode}</Text>
                      <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                        🚌 {fmtTime(b.tripDeparture)}
                      </Text>
                      {b.tripPlate && <Text variant="bodySmall">Xe: {b.tripPlate}</Text>}
                    </View>
                    <Chip mode="flat" style={{ backgroundColor: meta.color + '20' }} textStyle={{ color: meta.color }}>
                      {meta.label}
                    </Chip>
                  </View>

                  <Divider style={{ marginVertical: 8 }} />
                  <View style={styles.rowGap}>
                    <View><Text variant="bodySmall" style={styles.subtitle}>Số ghế</Text><Text style={{ fontWeight: '600' }}>{b.seatCount}</Text></View>
                    <View><Text variant="bodySmall" style={styles.subtitle}>Tổng tiền</Text><Text style={{ fontWeight: '600', color: '#16a34a' }}>{fmtMoney(b.totalAmount)}</Text></View>
                    <View><Text variant="bodySmall" style={styles.subtitle}>Thanh toán</Text><Text style={{ fontWeight: '600' }}>{b.paymentStatus}</Text></View>
                  </View>

                  {!!b.cancelReason && (
                    <Text variant="bodySmall" style={{ color: '#991b1b', marginTop: 8 }}>
                      Lý do: {b.cancelReason}
                    </Text>
                  )}
                </Card.Content>
                {canCancel && (
                  <Card.Actions>
                    <Button mode="outlined" textColor="#dc2626"
                      onPress={() => setCancelTarget(b)}>Huỷ booking</Button>
                  </Card.Actions>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={!!cancelTarget} onDismiss={() => setCancelTarget(null)}>
          <Dialog.Title>Huỷ booking?</Dialog.Title>
          <Dialog.Content>
            <Text>Bạn có chắc muốn huỷ booking {cancelTarget?.bookingCode}?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelTarget(null)}>Không</Button>
            <Button mode="contained" buttonColor="#dc2626" onPress={doCancel}>Huỷ</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: 24 },
  subtitle: { color: '#6b7280' },
});