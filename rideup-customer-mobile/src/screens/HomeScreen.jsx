import { useEffect, useState } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar, Card, IconButton, Text } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';
import { listProvinces, listWards, searchTrips } from '../api/api';
import { colors, FONT, HERO_IMAGE, shadow } from '../theme';
import Picker from '../components/Picker';
import DateField from '../components/DateField';

const TRIP_ICONS = ['🚕', '▣', '★'];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [provinces, setProvinces] = useState([]);
  const [pickupWards, setPickupWards] = useState([]);
  const [dropoffWards, setDropoffWards] = useState([]);
  const [fromProvinceId, setFromProvinceId] = useState('');
  const [toProvinceId, setToProvinceId] = useState('');
  const [pickupWardId, setPickupWardId] = useState('');
  const [dropoffWardId, setDropoffWardId] = useState('');
  const [date, setDate] = useState('');
  const [searchError, setSearchError] = useState('');
  const [trips, setTrips] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(null); // 'from' | 'pickup' | 'to' | 'dropoff'

  useEffect(() => {
    listProvinces().then(setProvinces).catch(() => {});
  }, []);

  useEffect(() => {
    setPickupWardId('');
    if (fromProvinceId) listWards(fromProvinceId).then(setPickupWards).catch(() => setPickupWards([]));
    else setPickupWards([]);
  }, [fromProvinceId]);

  useEffect(() => {
    setDropoffWardId('');
    if (toProvinceId) listWards(toProvinceId).then(setDropoffWards).catch(() => setDropoffWards([]));
    else setDropoffWards([]);
  }, [toProvinceId]);

  async function searchTripsAction() {
    const from = provinces.find((p) => p.id === fromProvinceId);
    const to = provinces.find((p) => p.id === toProvinceId);
    if (!fromProvinceId || !toProvinceId || !pickupWardId || !dropoffWardId || !date) {
      setSearchError('Vui lòng chọn đủ tỉnh, phường/xã và ngày khởi hành');
      return;
    }
    if (!from || !to || from.code === to.code) {
      setSearchError('Tỉnh đón và tỉnh trả phải khác nhau');
      return;
    }
    setSearchError('');
    setSearching(true);
    setSearched(true);
    try {
      const result = await searchTrips({
        startProvinceId: fromProvinceId,
        startWardId: pickupWardId,
        endProvinceId: toProvinceId,
        endWardId: dropoffWardId,
        departureDate: date,
      });
      setTrips(result);
    } catch (e) {
      setTrips([]);
      setSearchError(e.response?.data?.message || 'Không tìm được chuyến phù hợp');
    } finally {
      setSearching(false);
    }
  }

  const provinceName = (id) => provinces.find((p) => p.id === id)?.name || id || '?';
  const fmtMoney = (v) => `${new Intl.NumberFormat('vi-VN').format(v || 0)} đ`;
  const fmtTime = (v) => (v ? v.replace('T', ' ').slice(0, 16) : '--');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.hero} imageStyle={{ resizeMode: 'cover' }}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.brand}>RIDEUP</Text>
              <Text style={styles.greeting}>Xin chào, {user?.fullName || 'bạn'} <Text style={{ fontSize: 16 }}>👋</Text></Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('AccountTab', { screen: 'Account' })}
              accessibilityLabel="Mở tài khoản"
            >
              {renderHeroAvatar(user)}
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>Bạn muốn đi đâu?</Text>
          <Text style={styles.heroSubtitle}>Đặt nhanh, giá rõ ràng, tài xế đã xác minh.</Text>
          <LinearGradient pointerEvents="none" colors={['rgba(247,250,249,0)', colors.bg]} style={styles.heroFade} />
        </ImageBackground>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat icon="car-outline" value="0" label="Chuyến đang mở" />
          <Stat icon="clipboard-text-outline" value="0" label="Lượt đã đi" />
          <Stat icon="star-outline" value="5.0" label="Đánh giá" accent />
        </View>

        {/* Search panel */}
        <View style={styles.panel}>
          <View style={styles.panelHeading}>
            <Text style={styles.panelTitle}>Tìm chuyến ghép</Text>
            <Text style={styles.panelHint}>Chọn điểm đón/trả chi tiết</Text>
          </View>

          <PickerField
            icon="map-marker"
            label="TỈNH ĐÓN"
            value={fromProvinceId}
            options={provinces}
            isOpen={pickerOpen === 'from'}
            onOpenMenu={() => setPickerOpen('from')}
            onCloseMenu={() => setPickerOpen(null)}
            onSelect={(id) => { setFromProvinceId(id); setPickerOpen(null); }}
            placeholder="Chọn tỉnh/thành phố đón"
          />
          <PickerField
            icon="map-marker-radius"
            label="KHU VỰC ĐÓN"
            value={pickupWardId}
            options={pickupWards}
            isOpen={pickerOpen === 'pickup'}
            onOpenMenu={() => setPickerOpen('pickup')}
            onCloseMenu={() => setPickerOpen(null)}
            onSelect={(id) => { setPickupWardId(id); setPickerOpen(null); }}
            placeholder="Chọn quận/huyện, phường/xã đón"
          />
          <PickerField
            icon="map-marker"
            label="TỈNH TRẢ"
            value={toProvinceId}
            options={provinces}
            isOpen={pickerOpen === 'to'}
            onOpenMenu={() => setPickerOpen('to')}
            onCloseMenu={() => setPickerOpen(null)}
            onSelect={(id) => { setToProvinceId(id); setPickerOpen(null); }}
            placeholder="Chọn tỉnh/thành phố trả"
          />
          <PickerField
            icon="map-marker-radius"
            label="KHU VỰC TRẢ"
            value={dropoffWardId}
            options={dropoffWards}
            isOpen={pickerOpen === 'dropoff'}
            onOpenMenu={() => setPickerOpen('dropoff')}
            onCloseMenu={() => setPickerOpen(null)}
            onSelect={(id) => { setDropoffWardId(id); setPickerOpen(null); }}
            placeholder="Chọn quận/huyện, phường/xã trả"
          />

          <DateField value={date} onChange={setDate} />

          <View style={styles.dateShortcuts}>
            <ShortcutButton label="Tất cả ngày" onPress={() => setDate('')} />
            <ShortcutButton label="Hôm nay" onPress={() => setDate(todayIso())} />
            <ShortcutButton label="Ngày mai" onPress={() => setDate(tomorrowIso())} />
          </View>

          {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}

          <TouchableOpacity style={styles.searchButton} onPress={searchTripsAction} disabled={searching}>
            {searching ? <Text style={styles.searchButtonText}>Đang tìm chuyến...</Text> : <><MaterialCommunityIcons name="magnify" size={18} color="#fff" /><Text style={styles.searchButtonText}>Tìm chuyến ngay</Text></>}
          </TouchableOpacity>
        </View>

        {/* Open trips */}
        <View style={[styles.panel, { marginTop: 18 }]}>
          <View style={styles.sectionHeading}>
            <Text style={styles.panelTitle}>Chuyến xe đang mở</Text>
            <TouchableOpacity onPress={() => setTrips([])}>
              <Text style={styles.refreshLink}>Làm mới</Text>
            </TouchableOpacity>
          </View>

          {searched && trips.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  provinceName={provinceName}
                  fmtTime={fmtTime}
                  fmtMoney={fmtMoney}
                  onBook={() => navigation.navigate('BookingCreate', {
                    trip, pickupWardId, dropoffWardId,
                  })}
                />
              ))}
            </View>
          ) : searched ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><MaterialCommunityIcons name="car-outline" size={18} color={colors.primaryAccent} /></View>
              <Text style={styles.emptyStrong}>Không có chuyến phù hợp</Text>
              <Text style={styles.emptySpan}>Thử đổi ngày hoặc điểm đi, điểm đến.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><MaterialCommunityIcons name="car-outline" size={18} color={colors.primaryAccent} /></View>
              <Text style={styles.emptyStrong}>Chưa có chuyến xe đang mở</Text>
              <Text style={styles.emptySpan}>Hãy chọn điểm đi và điểm đến để tìm chuyến phù hợp.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label, accent }) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon} size={14} color={accent ? '#f2a900' : colors.primaryAccent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PickerField({ icon, label, value, options, isOpen, onOpenMenu, onCloseMenu, onSelect, placeholder }) {
  return (
    <View style={styles.selectRow}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.primaryAccent} style={styles.rowIcon} />
      <View style={styles.fieldCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Picker
          value={value}
          options={options}
          isOpen={isOpen}
          onOpen={onOpenMenu}
          onClose={onCloseMenu}
          onSelect={onSelect}
          placeholder={placeholder}
        />
      </View>
    </View>
  );
}

function ShortcutButton({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.shortcut}>
      <Text style={styles.shortcutText}>{label}</Text>
    </TouchableOpacity>
  );
}

function TripCard({ trip, provinceName, fmtTime, fmtMoney, onBook }) {
  return (
    <View style={styles.tripCard}>
      <View style={styles.tripCardHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripRoute}>{provinceName(trip.startProvinceId)} → {provinceName(trip.endProvinceId)}</Text>
          <View style={styles.tripTimeRow}><MaterialCommunityIcons name="clock-outline" size={13} color={colors.textSubtle} /><Text style={styles.tripTime}>{fmtTime(trip.departureTime)}</Text></View>
        </View>
        <View>
          <Text style={styles.tripPrice}>{fmtMoney(trip.priceVnd)}</Text>
          <Text style={styles.tripPriceUnit}>/ghế</Text>
        </View>
      </View>
      <View style={styles.tripMeta}>
        <View style={styles.driverMeta}><MaterialCommunityIcons name="account-outline" size={14} color={colors.textSubtle} /><Text>Tài xế {trip.driverName || 'RideUp'}</Text></View>
        <Text>Còn {trip.seatAvailable}/{trip.seatTotal} ghế</Text>
      </View>
      <TouchableOpacity style={styles.bookButton} onPress={onBook}>
        <Text style={styles.bookButtonText}>Đặt chỗ</Text>
      </TouchableOpacity>
    </View>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

/** Avatar nhỏ ở góc phải header — ưu tiên ảnh từ user.avatarUrl, fallback initials. */
function renderHeroAvatar(user) {
  const initials = (user?.fullName || user?.email || 'U')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const url = user?.avatarUrl
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `http://localhost:8080${user.avatarUrl}`)
    : null;
  return (
    <View style={styles.heroAvatarWrap}>
      {url ? (
        <Avatar.Image size={36} source={{ uri: url }} />
      ) : (
        <Avatar.Text
          size={36}
          label={initials}
          style={{ backgroundColor: colors.primaryAccent }}
          labelStyle={{ fontSize: 12, fontWeight: '700' }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { minHeight: 240, padding: 18, paddingBottom: 36, justifyContent: 'flex-start' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.heroOverlay },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontFamily: FONT[800], fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 2 },
  greeting: { fontFamily: FONT[600], marginTop: 8, fontSize: 14, fontWeight: '600', color: colors.textOnPrimary },
  heroAction: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroActionIcon: { color: 'white', fontSize: 16, fontWeight: '700' },
  heroAvatarWrap: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontFamily: FONT[700], marginTop: 28, fontSize: 25, fontWeight: '700', color: 'white', lineHeight: 28 },
  heroSubtitle: { fontFamily: FONT[400], marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.82)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 82 },

  statsRow: { flexDirection: 'row', marginHorizontal: 14, marginTop: -26, marginBottom: 16, gap: 7, zIndex: 2 },
  statBox: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 9, ...shadow(2, 0.1, 8) },
  statIcon: { fontSize: 11, color: colors.primaryAccent, marginBottom: 2 },
  statIconAccent: { color: '#f2a900' },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  statLabel: { marginTop: 4, fontSize: 9, color: colors.textMuted },

  panel: { marginHorizontal: 14, padding: 14, borderRadius: 12, backgroundColor: 'white', ...shadow(2, 0.07, 10) },
  panelTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  panelHeading: { marginBottom: 12 },
  panelHint: { fontSize: 9, color: colors.textLabel, marginTop: 1 },

  selectRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginBottom: 6, paddingHorizontal: 9, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surfaceMuted },
  rowIcon: { width: 24, fontSize: 13, color: colors.primaryAccent, textAlign: 'center' },
  fieldCopy: { flex: 1, marginLeft: 8 },
  fieldLabel: { fontSize: 8, fontWeight: '700', color: colors.textLabel, letterSpacing: 0.25 },

  dateShortcuts: { flexDirection: 'row', gap: 6, marginLeft: 33, marginTop: 3, marginBottom: 10 },
  shortcut: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.primaryFaintest },
  shortcutText: { fontSize: 9, color: colors.textMuted, fontWeight: '500' },

  searchError: { marginBottom: 10, padding: 9, borderWidth: 1, borderColor: '#f2cccc', borderRadius: 8, backgroundColor: colors.dangerLightBg, color: '#b34f4f', fontSize: 10 },
  searchButton: { flexDirection: 'row', gap: 6, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: 'white', fontSize: 13, fontWeight: '700' },

  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshLink: { color: colors.primaryAccent, fontSize: 10, fontWeight: '700' },

  emptyState: { marginTop: 14, paddingVertical: 19, paddingHorizontal: 12, borderWidth: 1, borderColor: '#cfe2da', borderStyle: 'dashed', borderRadius: 9, alignItems: 'center' },
  emptyIcon: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: colors.primaryFaintest, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  emptyStrong: { color: '#36564d', fontSize: 12, fontWeight: '700' },
  emptySpan: { marginTop: 4, fontSize: 10, color: colors.textSubtle },

  tripCard: { padding: 12, borderWidth: 1, borderColor: colors.borderMuted, borderRadius: 9, backgroundColor: colors.surfaceMuted, marginBottom: 8 },
  tripCardHead: { flexDirection: 'row', justifyContent: 'space-between' },
  tripRoute: { fontSize: 12, color: colors.textDark, fontWeight: '600' },
  tripTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tripTime: { fontSize: 10, color: colors.textSubtle },
  tripPrice: { fontSize: 12, fontWeight: '700', color: colors.primaryAccent },
  tripPriceUnit: { fontSize: 9, fontWeight: '500', color: colors.primaryAccent, textAlign: 'right' },
  tripMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9, fontSize: 10, color: colors.textSubtle },
  driverMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookButton: { marginTop: 10, paddingVertical: 8, borderRadius: 7, backgroundColor: colors.primary, alignItems: 'center' },
  bookButtonText: { color: 'white', fontSize: 11, fontWeight: '700' },
});