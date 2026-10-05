import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button, Card, HelperText, IconButton, Text, TextInput,
} from 'react-native-paper';
import * as Location from 'expo-location';
import { createBooking } from '../api/api';

/**
 * Màn hình đặt chỗ. Khác biệt so với web:
 * - Không dùng Google Maps (MapPicker). GPS lấy từ expo-location, người dùng có thể chỉnh tay.
 * - Form đơn giản hơn để phù hợp mobile.
 */
export default function BookingCreateScreen({ route, navigation }) {
  const { trip, seats: defaultSeats, pickupWardId, dropoffWardId } = route.params || {};
  const [seatsCount, setSeatsCount] = useState(String(defaultSeats || 1));
  const [pickupText, setPickupText] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [dropoffText, setDropoffText] = useState('');
  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLng, setDropoffLng] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!trip) {
    return (
      <View style={styles.container}>
        <Text>Không có dữ liệu chuyến.</Text>
        <Button onPress={() => navigation.navigate('Home')}>Về trang chủ</Button>
      </View>
    );
  }

  const totalAmount = trip.priceVnd * Number(seatsCount);
  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  // Lấy vị trí hiện tại qua GPS của thiết bị
  async function useMyLocationForPickup() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Cần quyền truy cập vị trí để dùng GPS');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setPickupLat(String(pos.coords.latitude));
    setPickupLng(String(pos.coords.longitude));
  }

  async function submit() {
    setError('');
    const seats = Number(seatsCount);
    if (!seats || seats < 1) { setError('Số ghế phải >= 1'); return; }
    if (seats > trip.seatAvailable) {
      setError(`Chuyến chỉ còn ${trip.seatAvailable} ghế`);
      return;
    }
    setLoading(true);
    try {
      await createBooking({
        tripId: trip.id,
        seatCount: seats,
        pickupAddressText: pickupText || null,
        pickupLat: pickupLat ? Number(pickupLat) : null,
        pickupLng: pickupLng ? Number(pickupLng) : null,
        dropoffAddressText: dropoffText || null,
        dropoffLat: dropoffLat ? Number(dropoffLat) : null,
        dropoffLng: dropoffLng ? Number(dropoffLng) : null,
        note: note || null,
      });
      navigation.navigate('MyBookings');
    } catch (e) {
      setError(e.response?.data?.message || 'Đặt chỗ thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>Đặt chỗ chuyến xe</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.kicker}>THÔNG TIN CHUYẾN</Text>
            <Text variant="titleSmall" style={{ fontWeight: '700' }}>
              🚌 {trip.startProvinceName} → {trip.endProvinceName}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Khởi hành: {fmtTime(trip.departureTime)} · Tài xế: {trip.driverName}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Còn {trip.seatAvailable}/{trip.seatTotal} ghế · Giá: {fmtMoney(trip.priceVnd)}/ghế
            </Text>
          </Card.Content>
        </Card>

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <Card>
          <Card.Content>
            <TextInput mode="outlined" label="Số ghế muốn đặt" value={seatsCount}
              onChangeText={setSeatsCount} keyboardType="numeric"
              style={{ marginBottom: 8 }} />

            <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: 8 }}>📍 Điểm đón</Text>
            <Button mode="text" icon="crosshairs-gps" onPress={useMyLocationForPickup}>
              Lấy vị trí hiện tại
            </Button>
            <TextInput mode="outlined" label="Vĩ độ (latitude)" value={pickupLat}
              onChangeText={setPickupLat} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput mode="outlined" label="Kinh độ (longitude)" value={pickupLng}
              onChangeText={setPickupLng} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput mode="outlined" label="Mô tả địa chỉ đón" value={pickupText}
              onChangeText={setPickupText} placeholder="Số 1 Võ Văn Ngân, Q. Thủ Đức"
              multiline style={{ marginBottom: 8 }} />

            <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: 8 }}>🏁 Điểm trả</Text>
            <TextInput mode="outlined" label="Vĩ độ" value={dropoffLat}
              onChangeText={setDropoffLat} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput mode="outlined" label="Kinh độ" value={dropoffLng}
              onChangeText={setDropoffLng} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput mode="outlined" label="Mô tả địa chỉ trả" value={dropoffText}
              onChangeText={setDropoffText} placeholder="Số 10 Phạm Văn Đồng, Q. Cầu Giấy"
              multiline style={{ marginBottom: 8 }} />

            <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: 8 }}>📝 Ghi chú cho tài xế</Text>
            <TextInput mode="outlined" label="Ghi chú" value={note}
              onChangeText={setNote} placeholder="Tôi sẽ mang theo 1 vali lớn..."
              multiline numberOfLines={3} style={{ marginBottom: 8 }} />
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 12, backgroundColor: '#ecfdf5' }}>
          <Card.Content>
            <Text variant="labelLarge" style={{ color: '#15803d' }}>TỔNG TIỀN</Text>
            <Text variant="headlineMedium" style={{ color: '#15803d', fontWeight: '700' }}>
              {fmtMoney(totalAmount)}
            </Text>
            <Text variant="bodySmall" style={{ color: '#15803d' }}>
              ({seatsCount} ghế × {fmtMoney(trip.priceVnd)})
            </Text>
          </Card.Content>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
          <Button mode="outlined" onPress={() => navigation.goBack()}>Quay lại</Button>
          <Button mode="contained" onPress={submit} loading={loading} disabled={loading}>
            Xác nhận đặt chỗ
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  kicker: { color: '#10b981', letterSpacing: 2, marginBottom: 4 },
  subtitle: { color: '#6b7280', marginTop: 2 },
});