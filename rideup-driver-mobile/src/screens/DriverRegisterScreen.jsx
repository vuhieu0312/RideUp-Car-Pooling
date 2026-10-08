import { useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { registerDriver } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import { colors, FONT, HERO_IMAGE, shadow } from '../theme';

export default function DriverRegisterScreen() {
  const { saveSession } = useAuth();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '',
    cccd: '', gplx: '', gplxExpiryDate: '',
  });
  const [files, setFiles] = useState({
    cccdImageFront: null, cccdImageBack: null, gplxImage: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  async function pickImage(key, source) {
    let result;
    if (source === 'camera') {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
    }
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setFiles((p) => ({ ...p, [key]: { uri: a.uri, name: a.fileName || `${key}.jpg`, type: a.mimeType || 'image/jpeg' } }));
    }
  }

  async function submit() {
    setError('');
    if (!form.fullName || !form.email || !form.password || !form.phone) { setError('Vui lòng điền đủ thông tin'); return; }
    if (form.password.length < 8) { setError('Mật khẩu tối thiểu 8 ký tự'); return; }
    if (!/^\d{12}$/.test(form.cccd)) { setError('CCCD phải đủ 12 chữ số'); return; }
    if (!form.gplx || !form.gplxExpiryDate) { setError('Vui lòng nhập GPLX + ngày hết hạn'); return; }
    if (!files.cccdImageFront || !files.cccdImageBack || !files.gplxImage) { setError('Vui lòng chọn đủ 3 ảnh'); return; }
    setLoading(true);
    try {
      const data = await registerDriver(form, files);
      await saveSession(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.hero} imageStyle={{ resizeMode: 'cover' }}>
          <View style={styles.heroOverlay} />
          <Text style={styles.brand}>RIDEUP · TÀI XẾ</Text>
          <Text style={styles.title}>Cùng RideUp{'\n'}lăn bánh mỗi ngày.</Text>
          <Text style={styles.subtitle}>Đăng ký hồ sơ, nhận chuyến và chủ động thời gian của bạn.</Text>
          <LinearGradient pointerEvents="none" colors={['rgba(247,250,249,0)', colors.bg]} style={styles.heroFade} />
        </ImageBackground>

        <View style={styles.card}>
          <View style={styles.heading}>
            <Text style={styles.kicker}>TÀI XẾ</Text>
            <Text style={styles.cardTitle}>Đăng ký hồ sơ</Text>
            <Text style={styles.cardSubtitle}>Admin sẽ duyệt hồ sơ trước khi bạn bắt đầu nhận chuyến.</Text>
          </View>

          {!!error && (
            <View style={styles.alertError}>
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          )}

          {/* Section 1: Thông tin cá nhân */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Thông tin cá nhân</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>👤  Họ và tên *</Text>
              <TextInput style={styles.input} value={form.fullName} onChangeText={set('fullName')} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>✉  Email *</Text>
              <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={set('email')} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>📞  Số điện thoại *</Text>
              <TextInput style={styles.input} keyboardType="phone-pad" placeholder="0912345678" placeholderTextColor="#a4b2ae" value={form.phone} onChangeText={set('phone')} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>🔒  Mật khẩu (≥ 8 ký tự) *</Text>
              <TextInput style={styles.input} secureTextEntry value={form.password} onChangeText={set('password')} />
            </View>
          </View>

          {/* Section 2: Giấy tờ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Giấy tờ tùy thân</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>🪪  Số CCCD (12 số) *</Text>
              <TextInput style={styles.input} keyboardType="numeric" maxLength={12} value={form.cccd} onChangeText={set('cccd')} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>🪪  Số GPLX *</Text>
              <TextInput style={styles.input} value={form.gplx} onChangeText={set('gplx')} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>🪪  Ngày hết hạn GPLX *</Text>
              <TextInput style={styles.input} placeholder="2030-12-31" placeholderTextColor="#a4b2ae" value={form.gplxExpiryDate} onChangeText={set('gplxExpiryDate')} />
            </View>
          </View>

          {/* Section 3: Ảnh */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Ảnh giấy tờ</Text>
            <ImageField label="CCCD mặt trước *" file={files.cccdImageFront} onPick={() => pickImage('cccdImageFront', 'lib')} onCapture={() => pickImage('cccdImageFront', 'camera')} />
            <ImageField label="CCCD mặt sau *" file={files.cccdImageBack} onPick={() => pickImage('cccdImageBack', 'lib')} onCapture={() => pickImage('cccdImageBack', 'camera')} />
            <ImageField label="GPLX *" file={files.gplxImage} onPick={() => pickImage('gplxImage', 'lib')} onCapture={() => pickImage('gplxImage', 'camera')} />
          </View>

          <TouchableOpacity style={styles.submit} onPress={submit} disabled={loading}>
            <Text style={styles.submitText}>{loading ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ đăng ký'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ImageField({ label, file, onPick, onCapture }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>📷  {label}</Text>
      {file?.uri ? (
        <View style={{ marginTop: 6 }}>
          <Image source={{ uri: file.uri }} style={{ width: '100%', height: 160, borderRadius: 8 }} />
          <View style={{ flexDirection: 'row', marginTop: 6, gap: 6 }}>
            <TouchableOpacity style={[styles.imageBtn, { flex: 1 }]} onPress={onPick}>
              <Text style={styles.imageBtnText}>🖼  Chọn ảnh khác</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.imageBtn, { flex: 1 }]} onPress={onCapture}>
              <Text style={styles.imageBtnText}>📷  Chụp lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <TouchableOpacity style={[styles.imageBtn, { flex: 1 }]} onPress={onPick}>
            <Text style={styles.imageBtnText}>🖼  Chọn ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.imageBtn, { flex: 1 }]} onPress={onCapture}>
            <Text style={styles.imageBtnText}>📷  Chụp ảnh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 245, paddingTop: 28, paddingHorizontal: 22, paddingBottom: 70, justifyContent: 'flex-start', overflow: 'hidden' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.authOverlay },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 76 },
  brand: { fontFamily: FONT[800], fontSize: 11, fontWeight: '800', color: 'white', letterSpacing: 2 },
  title: { fontFamily: FONT[700], marginTop: 52, fontSize: 27, lineHeight: 30, fontWeight: '700', color: 'white' },
  subtitle: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.86)', maxWidth: 285 },

  card: { marginTop: -42, marginHorizontal: 14, padding: 22, paddingBottom: 20, borderRadius: 14, backgroundColor: 'white', ...shadow(8, 0.12, 24) },

  alertError: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca', padding: 9, borderRadius: 6, marginBottom: 14 },
  alertErrorText: { fontSize: 11, color: colors.dangerText },

  heading: { marginBottom: 20 },
  kicker: { fontFamily: FONT[800], fontSize: 9, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 1.4 },
  cardTitle: { fontFamily: FONT[700], marginTop: 5, fontSize: 22, fontWeight: '700', color: colors.text },
  cardSubtitle: { marginTop: 4, fontSize: 12, color: colors.textSubtle },

  section: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e7f0ec' },
  sectionTitle: { fontFamily: FONT[700], marginBottom: 12, fontSize: 13, fontWeight: '700', color: colors.textDark },

  field: { marginBottom: 14 },
  fieldLabel: { fontFamily: FONT[700], fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  input: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 9, backgroundColor: colors.surfaceMuted, fontSize: 13, color: colors.textDark },

  imageBtn: { padding: 10, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', backgroundColor: colors.surfaceMuted },
  imageBtnText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  submit: { marginTop: 5, padding: 13, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center' },
  submitText: { fontFamily: FONT[700], color: 'white', fontSize: 13, fontWeight: '700' },
});