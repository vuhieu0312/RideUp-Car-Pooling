import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { listProvinces, listWards, searchTrips } from '../api/api';
import { colors } from '../theme';
import Picker from '../components/Picker';

export default function TripSearchScreen({ navigation }) {
  const [provinces, setProvinces] = useState([]);
  const [fromProvinceId, setFromProvinceId] = useState('');
  const [toProvinceId, setToProvinceId] = useState('');
  const [startWardId, setStartWardId] = useState('');
  const [endWardId, setEndWardId] = useState('');
  const [startWards, setStartWards] = useState([]);
  const [endWards, setEndWards] = useState([]);
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState('1');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(null);

  useEffect(() => { listProvinces().then(setProvinces).catch(() => {}); }, []);
  useEffect(() => {
    setStartWardId('');
    if (fromProvinceId) listWards(fromProvinceId).then(setStartWards).catch(() => setStartWards([]));
    else setStartWards([]);
  }, [fromProvinceId]);
  useEffect(() => {
    setEndWardId('');
    if (toProvinceId) listWards(toProvinceId).then(setEndWards).catch(() => setEndWards([]));
    else setEndWards([]);
  }, [toProvinceId]);

  async function runSearch() {
    if (!fromProvinceId || !startWardId || !toProvinceId || !endWardId || !date) {
      setError('Vui lòng chọn đủ tỉnh, phường/xã và ngày đi');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await searchTrips({
        startProvinceId: fromProvinceId, startWardId,
        endProvinceId: toProvinceId, endWardId,
        departureDate: date,
      });
      setTrips(result);
    } catch (e) {
      setError(e.response?.data?.message || 'Lỗi tìm chuyến');
    } finally {
      setLoading(false);
    }
  }

  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (iso) => (iso ? iso.replace('T', ' ').substring(0, 16) : '');

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>🔍 Tìm chuyến xe ghép</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <View style={styles.card}>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Tỉnh đón *</Text>
                <Picker value={fromProvinceId} options={provinces} isOpen={pickerOpen === 'fP'}
                  onOpen={() => setPickerOpen('fP')} onClose={() => setPickerOpen(null)}
                  onSelect={(id) => { setFromProvinceId(id); setPickerOpen(null); }} placeholder="Chọn tỉnh" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Khu vực đón *</Text>
                <Picker value={startWardId} options={startWards} isOpen={pickerOpen === 'fW'}
                  onOpen={() => setPickerOpen('fW')} onClose={() => setPickerOpen(null)}
                  onSelect={(id) => { setStartWardId(id); setPickerOpen(null); }} placeholder="Chọn khu vực" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Tỉnh trả *</Text>
                <Picker value={toProvinceId} options={provinces} isOpen={pickerOpen === 'tP'}
                  onOpen={() => setPickerOpen('tP')} onClose={() => setPickerOpen(null)}
                  onSelect={(id) => { setToProvinceId(id); setPickerOpen(null); }} placeholder="Chọn tỉnh" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Khu vực trả *</Text>
                <Picker value={endWardId} options={endWards} isOpen={pickerOpen === 'tW'}
                  onOpen={() => setPickerOpen('tW')} onClose={() => setPickerOpen(null)}
                  onSelect={(id) => { setEndWardId(id); setPickerOpen(null); }} placeholder="Chọn khu vực" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Ngày đi *</Text>
                <View style={styles.dateInput}><Text style={{ color: date ? colors.textDark : colors.textLabel }}>{date || 'YYYY-MM-DD'}</Text></View>
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  {['2026-10-05', '2026-10-06', '2026-10-07'].map((d) => (
                    <TouchableOpacity key={d} onPress={() => setDate(d)} style={styles.shortcut}>
                      <Text style={styles.shortcutText}>{d.slice(5)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ width: 80 }}>
                <Text style={styles.fieldLabel}>Ghế</Text>
                <View style={styles.dateInput}><Text>{seats}</Text></View>
              </View>
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={runSearch} disabled={loading}>
              <Text style={styles.searchBtnText}>{loading ? 'Đang tìm...' : 'Tìm'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {trips.length > 0 && <Text style={{ marginTop: 12 }}>Tìm thấy <Text style={{ fontWeight: '700' }}>{trips.length}</Text> chuyến:</Text>}

        {trips.map((t) => (
          <View key={t.id} style={[styles.card, { marginTop: 8 }]}>
            <View style={styles.tripHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripRoute}>🚌 {t.startProvinceName} → {t.endProvinceName}</Text>
                <Text style={styles.muted}>Tài xế: {t.driverName}{t.driverRating > 0 ? ` · ⭐ ${t.driverRating}` : ''}{t.vehiclePlate ? ` · 🚗 ${t.vehiclePlate}` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.tripPrice}>{fmtMoney(t.priceVnd)}</Text>
                <Text style={styles.muted}>/ghế</Text>
              </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.metrics}>
              <View style={styles.metric}><Text style={styles.metricLabel}>Khởi hành</Text><Text style={styles.metricValue}>{fmtTime(t.departureTime)}</Text></View>
              <View style={styles.metric}><Text style={styles.metricLabel}>Còn trống</Text><Text style={styles.metricValue}>{t.seatAvailable}/{t.seatTotal}</Text></View>
              <View style={styles.metric}><Text style={styles.metricLabel}>Tổng tiền</Text><Text style={[styles.metricValue, { color: colors.success }]}>{fmtMoney(t.priceVnd * Number(seats))}</Text></View>
            </View>
            <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('BookingCreate', { trip: t, seats: Number(seats) })}>
              <Text style={styles.bookBtnText}>Đặt chỗ</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { padding: 14 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  card: { padding: 13, borderRadius: 11, backgroundColor: 'white', borderWidth: 1, borderColor: colors.borderMuted, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 1 },
  fieldLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  dateInput: { minHeight: 38, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 8, backgroundColor: colors.surfaceMuted, justifyContent: 'center' },
  shortcut: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.primaryFaintest, marginRight: 6 },
  shortcutText: { fontSize: 10, color: colors.textMuted },
  searchBtn: { marginTop: 12, padding: 12, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' },
  searchBtnText: { color: 'white', fontWeight: '700' },
  errorText: { marginTop: 10, color: colors.danger, fontSize: 12 },
  muted: { fontSize: 11, color: colors.textSubtle },
  tripHead: { flexDirection: 'row', justifyContent: 'space-between' },
  tripRoute: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  tripPrice: { fontSize: 16, fontWeight: '700', color: colors.success },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  metrics: { flexDirection: 'row', gap: 24 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, color: colors.textSubtle },
  metricValue: { fontSize: 12, fontWeight: '600' },
  bookBtn: { marginTop: 12, padding: 8, borderRadius: 7, backgroundColor: colors.primary, alignItems: 'center' },
  bookBtnText: { color: 'white', fontWeight: '700' },
});