import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { colors, HERO_IMAGE } from '../theme';

export default function LoginScreen({ navigation }) {
  const { doLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const user = await doLogin(email, password);
      // Chỉ cho CUSTOMER role.
      if (!user.roles?.includes('CUSTOMER')) {
        throw new Error('Sai thông tin đăng nhập');
      }
    } catch (e) {
      setError('Email hoặc mật khẩu không đúng');
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
          <Text style={styles.title}>Đi cùng nhau,{'\n'}đi xa hơn.</Text>
          <Text style={styles.subtitle}>Đặt chuyến nhanh, giá rõ ràng và tài xế đã xác minh.</Text>
          <View style={styles.heroFade} />
        </ImageBackground>

        <View style={styles.card}>
          <View style={styles.heading}>
            <Text style={styles.kicker}>KHÁCH HÀNG</Text>
            <Text style={styles.cardTitle}>Chào mừng trở lại</Text>
            <Text style={styles.cardSubtitle}>Đăng nhập để tiếp tục hành trình của bạn.</Text>
          </View>

          {!!error && (
            <View style={styles.alertError}>
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>✉  Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#a4b2ae"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>🔒  Mật khẩu</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 42 }]}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#a4b2ae"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.submit} onPress={submit} disabled={loading}>
            <Text style={styles.submitText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.switchLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
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
  fieldLabel: { flexDirection: 'row', alignItems: 'center', fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  input: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 9, backgroundColor: colors.surfaceMuted, fontSize: 13, color: colors.textDark },
  passwordWrap: { position: 'relative' },
  eyeButton: { position: 'absolute', right: 7, top: 7, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { fontSize: 16 },

  submit: { marginTop: 5, padding: 13, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 13, fontWeight: '700' },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  switchText: { fontSize: 11, color: colors.textSubtle },
  switchLink: { fontSize: 11, color: colors.primaryAccent, fontWeight: '700' },
});