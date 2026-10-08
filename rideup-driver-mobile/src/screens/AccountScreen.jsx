import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar, Button, IconButton, Snackbar, Text } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';
import { getDriverProfile, getMyProfile, listMyVehicles, uploadAvatar } from '../api/api';
import { colors, FONT } from '../theme';

const GENDER_LABEL = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

/**
 * Trang tài khoản tài xế — thông tin cá nhân + rating/tổng chuyến + xe hiện tại.
 */
export default function AccountScreen({ navigation }) {
  const { user, doLogout, updateUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    // Chỉ set state local — KHÔNG gọi updateUser ở đây vì sẽ trigger re-render
    // toàn bộ AuthProvider → React Navigation reset tab state → giật về Home.
    // updateUser chỉ gọi khi thật sự thay đổi (sau upload avatar, lưu edit).
    Promise.all([
      getMyProfile().catch(() => null),
      getDriverProfile().catch(() => null),
      listMyVehicles().catch(() => []),
    ])
      .then(([p, d, vs]) => {
        if (p) setProfile(p);
        setDriver(d);
        // Ưu tiên xe đã active; fallback xe đầu tiên
        setVehicle((vs || []).find((v) => v.isActive) || (vs && vs[0]) || null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function pickAndUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh trong cài đặt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const updated = await uploadAvatar(result.assets[0]);
      setProfile(updated);
      await updateUser(updated);
      setSnack('Cập nhật ảnh đại diện thành công');
    } catch (e) {
      setSnack(e.response?.data?.message || 'Upload ảnh thất bại');
    } finally {
      setUploading(false);
    }
  }

  const initials = (profile?.fullName || profile?.email || 'U')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarUrl = profile?.avatarUrl
    ? (profile.avatarUrl.startsWith('http')
        ? profile.avatarUrl
        : `http://localhost:8080${profile.avatarUrl}`)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" iconColor={colors.textDark} onPress={() => navigation.goBack()} />
          <View>
            <Text style={styles.kicker}>HỒ SƠ TÀI XẾ</Text>
            <Text style={styles.title}>Tài khoản</Text>
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarCard}>
          <View>
            {avatarUrl ? (
              <Avatar.Image size={96} source={{ uri: avatarUrl }} />
            ) : (
              <Avatar.Text
                size={96}
                label={initials}
                style={{ backgroundColor: colors.primaryAccent }}
                labelStyle={{ fontWeight: '700' }}
              />
            )}
            <TouchableOpacity style={styles.cameraBtn} onPress={pickAndUpload} disabled={uploading}>
              <MaterialCommunityIcons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{profile?.fullName || 'Tài xế'}</Text>
          <Text style={styles.muted}>{profile?.email}</Text>
          {!!profile?.verified && (
            <View style={styles.verifiedRow}>
              <MaterialCommunityIcons name="check-decagram" size={13} color={colors.success} />
              <Text style={styles.verified}>Đã xác minh email</Text>
            </View>
          )}
        </View>

        {/* Rating + tổng chuyến */}
        {driver && (
          <View style={styles.ratingCard}>
            <View style={styles.ratingItem}>
              <View style={styles.starsRow}>
                {renderStars(driver.driverRating)}
              </View>
              <Text style={styles.ratingValue}>{Number(driver.driverRating || 0).toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>Đánh giá</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.ratingItem}>
              <Text style={[styles.ratingValue, { color: colors.primary }]}>{driver.totalDriverRides || 0}</Text>
              <Text style={styles.ratingLabel}>Chuyến đã chạy</Text>
            </View>
          </View>
        )}

        {/* Thông tin cá nhân */}
        <View style={styles.card}>
          <Text style={styles.cardKicker}>THÔNG TIN CÁ NHÂN</Text>
          <InfoRow icon="phone-outline" label="Số điện thoại" value={profile?.phoneNumber || profile?.phone || '—'} />
          <InfoRow icon="cake-variant-outline" label="Ngày sinh" value={formatDate(profile?.dateOfBirth)} />
          <InfoRow icon="account-outline" label="Giới tính" value={GENDER_LABEL[profile?.gender] || '—'} />
        </View>

        {/* Xe hiện tại */}
        <View style={styles.card}>
          <Text style={styles.cardKicker}>PHƯƠNG TIỆN</Text>
          {vehicle ? (
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleIcon}>
                <MaterialCommunityIcons name="car" size={22} color={colors.primaryAccent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
                <Text style={styles.vehicleMeta}>
                  {vehicle.vehicleBrand} {vehicle.vehicleModel} · {vehicle.vehicleType} · {vehicle.seatCapacity} chỗ
                </Text>
                {vehicle.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <MaterialCommunityIcons name="check-decagram" size={11} color={colors.success} />
                    <Text style={styles.verifiedText}>Đã duyệt</Text>
                  </View>
                ) : (
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.warningBg }]}>
                    <MaterialCommunityIcons name="clock-outline" size={11} color={colors.warning} />
                    <Text style={[styles.verifiedText, { color: colors.warning }]}>Đang chờ duyệt</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noVehicle}>
              <Text style={styles.noVehicleText}>Bạn chưa đăng ký phương tiện.</Text>
              <Button
                mode="outlined"
                icon="plus"
                onPress={() => navigation.navigate('VehicleRegister')}
                textColor={colors.primaryAccent}
                style={{ marginTop: 8, alignSelf: 'flex-start' }}
              >
                Đăng ký xe
              </Button>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="account-edit-outline"
            onPress={() => navigation.navigate('EditProfile', { profile })}
            buttonColor={colors.primary}
            textColor="#fff"
            style={styles.btn}
            contentStyle={styles.btnContent}
          >
            Sửa thông tin
          </Button>
          <Button
            mode="outlined"
            icon="lock-outline"
            onPress={() => navigation.navigate('ChangePassword')}
            style={styles.btn}
            contentStyle={styles.btnContent}
            textColor={colors.primary}
          >
            Đổi mật khẩu
          </Button>
          <Button
            mode="text"
            icon="logout"
            onPress={doLogout}
            textColor={colors.danger}
            style={styles.btn}
            contentStyle={styles.btnContent}
          >
            Đăng xuất
          </Button>
        </View>
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primaryAccent} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function renderStars(rating) {
  const filled = Math.round(Number(rating) || 0);
  return [1, 2, 3, 4, 5].map((i) => (
    <MaterialCommunityIcons
      key={i}
      name={i <= filled ? 'star' : 'star-outline'}
      size={18}
      color="#f2a900"
    />
  ));
}

function formatDate(d) {
  if (!d) return '—';
  if (typeof d === 'string') return d;
  try {
    return new Date(d).toLocaleDateString('vi-VN');
  } catch {
    return String(d);
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingHorizontal: 4 },
  kicker: { fontFamily: FONT[800], fontSize: 9, color: colors.primaryAccent, letterSpacing: 1.5, fontWeight: '800' },
  title: { fontFamily: FONT[700], fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },

  avatarCard: { alignItems: 'center', marginTop: 8, marginBottom: 14 },
  cameraBtn: {
    position: 'absolute', right: -2, bottom: -2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  name: { fontFamily: FONT[700], marginTop: 12, fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { marginTop: 2, fontSize: 12, color: colors.textSubtle },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  verified: { fontSize: 11, color: colors.success, fontWeight: '600' },

  ratingCard: {
    flexDirection: 'row', marginHorizontal: 14, marginBottom: 12, padding: 14,
    borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border,
  },
  ratingItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: colors.border },
  starsRow: { flexDirection: 'row', gap: 2 },
  ratingValue: { fontFamily: FONT[800], marginTop: 4, fontSize: 17, fontWeight: '800', color: '#f2a900' },
  ratingLabel: { marginTop: 2, fontSize: 10, color: colors.textSubtle, fontWeight: '600' },

  card: { marginHorizontal: 14, marginTop: 4, padding: 14, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border },
  cardKicker: { fontFamily: FONT[800], fontSize: 9, color: colors.primaryAccent, letterSpacing: 1.5, fontWeight: '800', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border },
  rowLabel: { fontSize: 10, color: colors.textSubtle, fontWeight: '600' },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 1 },

  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryFaintest, alignItems: 'center', justifyContent: 'center' },
  vehiclePlate: { fontFamily: FONT[800], fontSize: 15, fontWeight: '800', color: colors.text },
  vehicleMeta: { fontSize: 11, color: colors.textSubtle, marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 3, marginTop: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.successBg },
  verifiedText: { fontSize: 10, color: colors.successDark, fontWeight: '700' },
  noVehicle: { alignItems: 'flex-start', paddingVertical: 8 },
  noVehicleText: { fontSize: 12, color: colors.textSubtle },

  actions: { marginTop: 18, paddingHorizontal: 14, gap: 8 },
  btn: { borderRadius: 9 },
  btnContent: { paddingVertical: 4 },
});
