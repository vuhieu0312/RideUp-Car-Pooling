import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { createBooking } from '../api/api';
import { colors } from '../theme';

export default function BookingCreateScreen({ route, navigation }) {
  const { trip, seats: defaultSeats, pickupWardId, dropoffWardId } = route.params || {};
  const [seats, setSeats] = useState(String(defaultSeats || 1));
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
        <Text style={{ padding: 16 }}>Không có dữ liệu chuyến.</Text>
      </View>
    );
  }

  const total = trip.priceVnd * Number(seats);
  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  async function useMyLocation() {
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
    const n = Number(seats);
    if (!n || n < 1) { setError('Số ghế phải >= 1'); return; }
    if (n > trip.seatAvailable) { setError(`Chuyến chỉ còn ${trip.seatAvailable} ghế`); return; }
    setLoading(true);
    try {
      await createBooking({
        tripId: trip.id,
        seatCount: n,
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
      {/* Header green */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerKicker}>RIDEUP</Text>
          <Text style={styles.headerTitle}>Đặt chỗ chuyến xe</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14 }}>
        {/* Thông tin chuyến */}
        <View style={styles.card}>
          <Text style={styles.cardKicker}>THÔNG TIN CHUYẾN</Text>
          <Text style={styles.tripLine}>🚌 <Text style={{ fontWeight: '700' }}>{trip.startProvinceName}</Text> → <Text style={{ fontWeight: '700' }}>{trip.endProvinceName}</Text></Text>
          <Text style={styles.muted}>Khởi hành: {fmtTime(trip.departureTime)} · Tài xế: {trip.driverName}{trip.driverRating > 0 ? ` · ⭐ ${trip.driverRating}` : ''}</Text>
          <Text style={styles.muted}>Còn {trip.seatAvailable}/{trip.seatTotal} ghế · Giá: {fmtMoney(trip.priceVnd)}/ghế</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.card}>
          <Text style={styles.label}>Số ghế muốn đặt</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={seats} onChangeText={setSeats} />

          <Text style={styles.section}>📍 Điểm đón</Text>
          <TouchableOpacity style={styles.gpsBtn} onPress={useMyLocation}>
            <Text style={styles.gpsBtnText}>📡 Lấy vị trí hiện tại</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Vĩ độ" placeholderTextColor="#a4b2ae" keyboardType="numeric" value={pickupLat} onChangeText={setPickupLat} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Kinh độ" placeholderTextColor="#a4b2ae" keyboardType="numeric" value={pickupLng} onChangeText={setPickupLng} />
          </View>
          <TextInput style={[styles.input, styles.multiline]} placeholder="Mô tả địa chỉ đón (vd: Số 1 Võ Văn Ngân)" placeholderTextColor="#a4b2ae" multiline value={pickupText} onChangeText={setPickupText} />

          <Text style={styles.section}>🏁 Điểm trả</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Vĩ độ" placeholderTextColor="#a4b2ae" keyboardType="numeric" value={dropoffLat} onChangeText={setDropoffLat} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Kinh độ" placeholderTextColor="#a4b2ae" keyboardType="numeric" value={dropoffLng} onChangeText={setDropoffLng} />
          </View>
          <TextInput style={[styles.input, styles.multiline]} placeholder="Mô tả địa chỉ trả" placeholderTextColor="#a4b2ae" multiline value={dropoffText} onChangeText={setDropoffText} />

          <Text style={styles.section}>📝 Ghi chú cho tài xế</Text>
          <TextInput style={[styles.input, styles.multiline, { minHeight: 70 }]} placeholder="Tôi sẽ mang theo 1 vali lớn..." placeholderTextColor="#a4b2ae" multiline value={note} onChangeText={setNote} />
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalKicker}>TỔNG TIỀN</Text>
          <Text style={styles.totalPrice}>{fmtMoney(total)}</Text>
          <Text style={styles.totalHint}>({seats} ghế × {fmtMoney(trip.priceVnd)})</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.submitBtnText, { color: colors.text }]}>Quay lại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={submit} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Đang đặt...' : 'Xác nhận đặt chỗ'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 68, paddingHorizontal: 14, backgroundColor: '#08b85c' },
  backBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  backIcon: { color: 'white', fontSize: 20, fontWeight: '700' },
  headerKicker: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5 },
  headerTitle: { marginTop: 2, fontSize: 17, fontWeight: '700', color: 'white' },

  card: { padding: 13, marginBottom: 12, borderWidth: 1, borderColor: colors.borderMuted, borderRadius: 11, backgroundColor: 'white', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 1 },
  cardKicker: { fontSize: 11, fontWeight: '700', color: colors.primaryAccent, textTransform: 'uppercase', marginBottom: 8 },
  muted: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  tripLine: { fontSize: 12, color: colors.textDark },
  errorText: { color: colors.danger, fontSize: 11, marginBottom: 10 },

  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  input: { paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 8, backgroundColor: colors.surfaceMuted, fontSize: 12, color: colors.textDark, marginBottom: 8 },
  multiline: { minHeight: 50, textAlignVertical: 'top' },

  section: { marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '700', color: colors.textDark },

  gpsBtn: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  gpsBtnText: { fontSize: 12, color: colors.primaryAccent, fontWeight: '700' },

  totalBox: { marginTop: 14, padding: 13, borderRadius: 11, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: '#9ddcba' },
  totalKicker: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  totalPrice: { fontSize: 24, fontWeight: '700', color: '#15803d', marginTop: 4 },
  totalHint: { fontSize: 11, color: '#15803d' },

  submitBtn: { flex: 1, padding: 12, borderRadius: 9, alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
});