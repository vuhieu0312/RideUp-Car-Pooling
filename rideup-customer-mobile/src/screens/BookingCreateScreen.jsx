import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBooking, listProvinces, listWards } from '../api/api';
import { usePayment } from '../hooks/usePayment';
import LocationMapPicker from '../components/LocationMapPicker';
import { colors, FONT, shadow } from '../theme';
import IconText from '../components/IconText';
import { Text, TextInput } from '../components/Typography';
import { useDialog } from '../components/AppDialog';

const EMPTY_LOC = { lat: NaN, lng: NaN, addressText: '' };
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt', icon: 'cash', desc: 'Trả tài xế khi lên xe' },
  { value: 'STRIPE', label: 'Stripe', icon: 'credit-card-outline', desc: 'Thanh toán online bằng thẻ' },
];

export default function BookingCreateScreen({ route, navigation }) {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { pay: payWithStripe, loading: stripeLoading } = usePayment();
  const { trip, seats: defaultSeats, pickupWardId: initPickupWardId, dropoffWardId: initDropoffWardId } = route.params || {};
  const [seats, setSeats] = useState(String(defaultSeats || 1));
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [pickup, setPickup] = useState(EMPTY_LOC);
  const [pickupWardId, setPickupWardId] = useState(initPickupWardId || '');
  const [dropoff, setDropoff] = useState(EMPTY_LOC);
  const [dropoffWardId, setDropoffWardId] = useState(initDropoffWardId || '');
  const [pickupWards, setPickupWards] = useState([]);
  const [dropoffWards, setDropoffWards] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load wards cho điểm đón (theo startProvinceId) và điểm trả (theo endProvinceId)
  useEffect(() => {
    if (!trip) return;
    let cancelled = false;
    setLoadingWards(true);
    Promise.all([
      listProvinces().catch((e) => {
        console.warn('[BookingCreate] listProvinces failed:', e?.message, e?.response?.status);
        return [];
      }),
      trip.startProvinceId ? listWards(trip.startProvinceId).catch((e) => {
        console.warn('[BookingCreate] listWards pickup failed:', e?.message, e?.response?.status);
        return [];
      }) : Promise.resolve([]),
      trip.endProvinceId ? listWards(trip.endProvinceId).catch((e) => {
        console.warn('[BookingCreate] listWards dropoff failed:', e?.message, e?.response?.status);
        return [];
      }) : Promise.resolve([]),
    ])
      .then(([provs, pWards, dWards]) => {
        if (cancelled) return;
        setProvinces(provs || []);
        setPickupWards(pWards || []);
        setDropoffWards(dWards || []);
        if (!provs || provs.length === 0) {
          setError('Không tải được danh sách tỉnh/thành. Vui lòng thử lại sau.');
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.message || 'Không tải được danh sách phường/xã');
      })
      .finally(() => { if (!cancelled) setLoadingWards(false); });
    return () => { cancelled = true; };
  }, [trip?.id, trip?.startProvinceId, trip?.endProvinceId]);

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

  // Hiển thị tên tỉnh: lookup từ list provinces, fallback tên ngắn nếu tìm thấy
  const provinceName = (id) => provinces.find((p) => p.id === id)?.name || '—';
  const startLabel = provinceName(trip.startProvinceId);
  const endLabel = provinceName(trip.endProvinceId);
  // Lấy lat/lng tâm tỉnh để truyền cho LocationMapPicker (dùng làm bias + filter trong tỉnh)
  const startProvince = provinces.find((p) => p.id === trip.startProvinceId);
  const endProvince = provinces.find((p) => p.id === trip.endProvinceId);

  function isLocationComplete(loc) {
    return Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng) && (loc?.addressText || '').trim().length > 0;
  }

  // Sang tab "Chuyến xe" và dọn stack tab Trang chủ về màn Home, để lúc bấm lại
  // "Trang chủ" không còn thấy form đặt chỗ của booking đã xong.
  function goToMyBookings() {
    navigation.navigate('MyBookingsTab');
    navigation.popToTop();
  }

  async function submit() {
    setError('');
    const n = Number(seats);
    if (!n || n < 1) { setError('Số ghế phải >= 1'); return; }
    if (n > trip.seatAvailable) { setError(`Chuyến chỉ còn ${trip.seatAvailable} ghế`); return; }
    if (!pickupWardId) { setError('Vui lòng chọn Phường/Xã cho điểm đón'); return; }
    if (!dropoffWardId) { setError('Vui lòng chọn Phường/Xã cho điểm trả'); return; }
    if (!isLocationComplete(pickup)) { setError('Vui lòng ghim vị trí và nhập địa chỉ chi tiết cho điểm đón'); return; }
    if (!isLocationComplete(dropoff)) { setError('Vui lòng ghim vị trí và nhập địa chỉ chi tiết cho điểm trả'); return; }

    setLoading(true);
    try {
      const response = await createBooking({
        tripId: trip.id,
        seatCount: n,
        paymentMethod,
        pickupWardId,
        pickupAddressText: pickup.addressText,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffWardId,
        dropoffAddressText: dropoff.addressText,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        note: note || null,
      });
      // Backend trả về `{ code, message, data: BookingResponse }`
      const booking = response?.data || response;

      // Stripe: mở PaymentSheet NGAY sau khi đặt chỗ thành công — không qua bước Alert trung gian.
      if (paymentMethod === 'STRIPE' && booking?.paymentId) {
        const result = await payWithStripe({ bookingId: booking.id, paymentId: booking.paymentId });
        if (result.success) {
          dialog.alert(
            'Đặt cọc thành công',
            'Booking của bạn đang chờ tài xế xác nhận.'
          );
        }
        // Booking đã tạo xong dù thanh toán thành công, lỗi, hay bị huỷ — luôn chuyển sang "Chuyến xe của tôi" để xem trạng thái / trả lại tiền nếu cần (nút...
        goToMyBookings();
        return;
      }

      goToMyBookings();
    } catch (e) {
      setError(e.response?.data?.message || 'Đặt chỗ thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header green */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
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
          <IconText name="bus" size={16} textStyle={styles.tripLine}>
            <Text style={{ fontWeight: '700' }}>{startLabel}</Text> → <Text style={{ fontWeight: '700' }}>{endLabel}</Text>
          </IconText>
          <Text style={styles.muted}>Khởi hành: {fmtTime(trip.departureTime)} · Tài xế: {trip.driverName}</Text>
          {trip.driverRating > 0 && (
            <IconText name="star" size={12} color="#f59e0b" gap={4} textStyle={styles.muted}>{trip.driverRating} / 5</IconText>
          )}
          <Text style={styles.muted}>Còn {trip.seatAvailable}/{trip.seatTotal} ghế · Giá: {fmtMoney(trip.priceVnd)}/ghế</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.card}>
          <Text style={styles.label}>Số ghế muốn đặt</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={seats} onChangeText={setSeats} />

          {/* Phương thức thanh toán */}
          <IconText name="wallet-outline" size={16} textStyle={styles.section}>Phương thức thanh toán</IconText>
          <View style={styles.payMethodRow}>
            {PAYMENT_METHODS.map((pm) => {
              const active = paymentMethod === pm.value;
              return (
                <TouchableOpacity
                  key={pm.value}
                  style={[styles.payMethod, active && styles.payMethodActive]}
                  onPress={() => setPaymentMethod(pm.value)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={pm.icon}
                    size={20}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.payMethodLabel, active && styles.payMethodLabelActive]}>
                    {pm.label}
                  </Text>
                  <Text style={styles.payMethodDesc} numberOfLines={1}>{pm.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Điểm đón */}
          <IconText name="map-marker-outline" size={16} textStyle={styles.section}>Điểm đón</IconText>
          {loadingWards ? (
            <Text style={styles.muted}>Đang tải thông tin phường/xã...</Text>
          ) : (
            <LocationMapPicker
              title="Điểm đón"
              wardOptions={pickupWards}
              wardId={pickupWardId}
              onWardChange={setPickupWardId}
              value={pickup}
              onChange={setPickup}
              accentColor={colors.primaryAccent}
              wardReadOnly
              wardName={pickupWards.find((w) => w.id === pickupWardId)?.name}
              provinceLat={Number(startProvince?.lat)}
              provinceLng={Number(startProvince?.lng)}
            />
          )}

          {/* Điểm trả */}
          <IconText name="flag-outline" size={16} textStyle={[styles.section, { marginTop: 4 }]}>Điểm trả</IconText>
          {loadingWards ? (
            <Text style={styles.muted}>Đang tải thông tin phường/xã...</Text>
          ) : (
            <LocationMapPicker
              title="Điểm trả"
              wardOptions={dropoffWards}
              wardId={dropoffWardId}
              onWardChange={setDropoffWardId}
              value={dropoff}
              onChange={setDropoff}
              accentColor={colors.primaryAccent}
              wardReadOnly
              wardName={dropoffWards.find((w) => w.id === dropoffWardId)?.name}
              provinceLat={Number(endProvince?.lat)}
              provinceLng={Number(endProvince?.lng)}
            />
          )}

          <IconText name="note-edit-outline" size={16} textStyle={[styles.section, { marginTop: 4 }]}>Ghi chú cho tài xế</IconText>
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
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 68, paddingHorizontal: 14, backgroundColor: colors.primary },
  backBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  backIcon: { fontFamily: FONT[700], color: 'white', fontSize: 20, fontWeight: '700' },
  headerKicker: { fontFamily: FONT[800], fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5 },
  headerTitle: { fontFamily: FONT[700], marginTop: 2, fontSize: 17, fontWeight: '700', color: 'white' },

  card: { padding: 13, marginBottom: 12, borderWidth: 1, borderColor: colors.borderMuted, borderRadius: 11, backgroundColor: 'white', ...shadow(2, 0.07, 8) },
  cardKicker: { fontFamily: FONT[700], fontSize: 11, fontWeight: '700', color: colors.primaryAccent, textTransform: 'uppercase', marginBottom: 8 },
  muted: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  tripLine: { fontSize: 12, color: colors.textDark },
  errorText: { color: colors.danger, fontSize: 11, marginBottom: 10 },

  label: { fontFamily: FONT[600], fontSize: 11, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  input: { paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 8, backgroundColor: colors.surfaceMuted, fontSize: 12, color: colors.textDark, marginBottom: 8 },
  multiline: { minHeight: 50, textAlignVertical: 'top' },

  section: { fontFamily: FONT[700], marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '700', color: colors.textDark },

  // Payment method picker
  payMethodRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  payMethod: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: 9,
    backgroundColor: colors.surfaceMuted, alignItems: 'center', gap: 4,
  },
  payMethodActive: {
    borderColor: colors.primary, backgroundColor: colors.primaryLight,
  },
  payMethodLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  payMethodLabelActive: { color: colors.primaryDark },
  payMethodDesc: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },

  totalBox: { marginTop: 14, padding: 13, borderRadius: 11, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: '#9ddcba' },
  totalKicker: { fontFamily: FONT[700], fontSize: 11, fontWeight: '700', color: '#15803d' },
  totalPrice: { fontFamily: FONT[700], fontSize: 24, fontWeight: '700', color: '#15803d', marginTop: 4 },
  totalHint: { fontSize: 11, color: '#15803d' },

  submitBtn: { flex: 1, padding: 12, borderRadius: 9, alignItems: 'center' },
  submitBtnText: { fontFamily: FONT[700], color: 'white', fontSize: 12, fontWeight: '700' },
});
