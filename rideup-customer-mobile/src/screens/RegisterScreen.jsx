import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { registerCustomer } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import { colors, HERO_IMAGE } from '../theme';

export default function RegisterScreen() {
  const { doLogin } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k) { return (v) => setForm((p) => ({ ...p, [k]: v })); }

  async function submit() {
    setError('');
    if (!form.fullName || !form.email || !form.phone || !form.password) {
      setError('Vui lòng điền đủ thông tin');
      return;
    }
    if (form.password.length < 8) {
      setError('Mật khẩu tối thiểu 8 ký tự');
      return;
    }
    setLoading(true);
    try {
      await registerCustomer(form.fullName, form.email, form.phone, form.password);
      await doLogin(form.email, form.password);
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
          <Text style={styles.brand}>RIDEUP</Text>
          <Text style={styles.title}>Bắt đầu hành trình{'\n'}của riêng bạn.</Text>
          <Text style={styles.subtitle}>Tạo tài khoản để tìm chuyến xe phù hợp hơn mỗi ngày.</Text>
          <View style={styles.heroFade} />
        </ImageBackground>

        <View style={styles.card}>
          <View style={styles.heading}>
            <Text style={styles.kicker}>KHÁCH HÀNG</Text>
            <Text style={styles.cardTitle}>Tạo tài khoản</Text>
            <Text style={styles.cardSubtitle}>Điền thông tin để bắt đầu sử dụng RideUp.</Text>
          </View>

          {!!error && (
            <View style={styles.alertError}>
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>👤  Họ và tên</Text>
            <TextInput style={styles.input} placeholder="Nguyễn Văn A" placeholderTextColor="#a4b2ae" value={form.fullName} onChangeText={set('fullName')} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>✉  Email</Text>
            <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#a4b2ae" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={set('email')} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>📞  Số điện thoại</Text>
            <TextInput style={styles.input} placeholder="0912345678" placeholderTextColor="#a4b2ae" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>🔒  Mật khẩu (tối thiểu 8 ký tự)</Text>
            <View style={styles.passwordWrap}>
              <TextInput style={[styles.input, { paddingRight: 42 }]} placeholder="Nhập mật khẩu" placeholderTextColor="#a4b2ae" secureTextEntry={!showPassword} value={form.password} onChangeText={set('password')} />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.submit} onPress={submit} disabled={loading}>
            <Text style={styles.submitText}>{loading ? 'Đang đăng ký...' : 'Đăng ký'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 245, paddingTop: 28, paddingHorizontal: 22, paddingBottom: 70, justifyContent: 'flex-start' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.authOverlay },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 76, backgroundColor: colors.bg, opacity: 0.96, transform: [{ scaleY: -1 }] },
  brand: { fontSize: 11, fontWeight: '800', color: 'white', letterSpacing: 2 },
  title: { marginTop: 52, fontSize: 27, lineHeight: 30, fontWeight: '700', color: 'white' },
  subtitle: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.86)', maxWidth: 285 },

  card: { marginTop: -42, marginHorizontal: 14, padding: 22, paddingBottom: 20, borderRadius: 14, backgroundColor: 'white', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6 },

  alertError: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca', padding: 9, borderRadius: 6, marginBottom: 14 },
  alertErrorText: { fontSize: 11, color: colors.dangerText },

  heading: { marginBottom: 20 },
  kicker: { fontSize: 9, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 1.4 },
  cardTitle: { marginTop: 5, fontSize: 22, fontWeight: '700', color: colors.text },
  cardSubtitle: { marginTop: 4, fontSize: 12, color: colors.textSubtle },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  input: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 9, backgroundColor: colors.surfaceMuted, fontSize: 13, color: colors.textDark },
  passwordWrap: { position: 'relative' },
  eyeButton: { position: 'absolute', right: 7, top: 7, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { fontSize: 16 },

  submit: { marginTop: 5, padding: 13, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 13, fontWeight: '700' },
});