import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar, Button, IconButton, Snackbar, Text } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';
import { getMyProfile, uploadAvatar } from '../api/api';
import { colors } from '../theme';

const GENDER_LABEL = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

/**
 * Trang tài khoản — xem thông tin, đổi avatar, vào màn sửa / đổi mật khẩu, đăng xuất.
 */
export default function AccountScreen({ navigation }) {
  const { user, doLogout, updateUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    // Chỉ set state local — KHÔNG gọi updateUser ở đây vì sẽ trigger re-render
    // toàn bộ AuthProvider → React Navigation reset tab state → giật về Home.
    // updateUser chỉ gọi khi thật sự thay đổi (sau upload avatar, lưu edit).
    getMyProfile()
      .then((data) => setProfile(data))
      .catch(() => {})
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
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="arrow-left" iconColor={colors.text} onPress={() => navigation.goBack()} />
          <View>
            <Text style={styles.kicker}>HỒ SƠ</Text>
            <Text style={styles.title}>Tài khoản</Text>
          </View>
        </View>

        {/* Avatar card */}
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
          <Text style={styles.name}>{profile?.fullName || 'Người dùng'}</Text>
          <Text style={styles.muted}>{profile?.email}</Text>
          {!!profile?.verified && (
            <View style={styles.verifiedRow}>
              <MaterialCommunityIcons name="check-decagram" size={13} color={colors.success} />
              <Text style={styles.verified}>Đã xác minh email</Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardKicker}>THÔNG TIN CÁ NHÂN</Text>
          <InfoRow icon="phone-outline" label="Số điện thoại" value={profile?.phoneNumber || profile?.phone || '—'} />
          <InfoRow icon="cake-variant-outline" label="Ngày sinh" value={formatDate(profile?.dateOfBirth)} />
          <InfoRow icon="account-outline" label="Giới tính" value={GENDER_LABEL[profile?.gender] || '—'} />
          <InfoRow icon="shield-account-outline" label="Vai trò" value={(profile?.roles || []).join(', ')} />
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
  kicker: { fontSize: 9, color: colors.primaryAccent, letterSpacing: 1.5, fontWeight: '800' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },

  avatarCard: { alignItems: 'center', marginTop: 8, marginBottom: 14 },
  cameraBtn: {
    position: 'absolute', right: -2, bottom: -2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  name: { marginTop: 12, fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { marginTop: 2, fontSize: 12, color: colors.textSubtle },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  verified: { fontSize: 11, color: colors.success, fontWeight: '600' },

  card: { marginHorizontal: 14, padding: 14, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border },
  cardKicker: { fontSize: 9, color: colors.primaryAccent, letterSpacing: 1.5, fontWeight: '800', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border },
  rowLabel: { fontSize: 10, color: colors.textSubtle, fontWeight: '600' },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 1 },

  actions: { marginTop: 18, paddingHorizontal: 14, gap: 8 },
  btn: { borderRadius: 9 },
  btnContent: { paddingVertical: 4 },
});
