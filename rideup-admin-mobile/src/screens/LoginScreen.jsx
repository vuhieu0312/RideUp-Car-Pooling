import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../auth/AuthContext';
import { colors, HERO_IMAGE } from '../theme';

export default function LoginScreen() {
  const { doLogin } = useAuth();
  const [email, setEmail] = useState('admin@rideup.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      await doLogin(email, password);
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
          <Text style={styles.brand}>RIDEUP · ADMIN</Text>
          <Text style={styles.title}>🛡️ Đăng nhập{'\n'}quản trị hệ thống.</Text>
          <Text style={styles.subtitle}>Dành cho quản trị viên. Nếu là khách hoặc tài xế, vui lòng dùng app phù hợp.</Text>
          <LinearGradient pointerEvents="none" colors={['rgba(247,250,249,0)', colors.bg]} style={styles.heroFade} />
        </ImageBackground>

        <View style={styles.card}>
          <View style={styles.heading}>
            <Text style={styles.kicker}>QUẢN TRỊ</Text>
            <Text style={styles.cardTitle}>Chào mừng trở lại</Text>
            <Text style={styles.cardSubtitle}>Đăng nhập để duyệt hồ sơ và quản lý hệ thống.</Text>
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
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>🔒  Mật khẩu</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.submit} onPress={submit} disabled={loading}>
            <Text style={styles.submitText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 245, paddingTop: 28, paddingHorizontal: 22, paddingBottom: 70, justifyContent: 'flex-start', overflow: 'hidden' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.authOverlay },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 76 },
  brand: { fontSize: 11, fontWeight: '800', color: 'white', letterSpacing: 2 },
  title: { marginTop: 52, fontSize: 27, lineHeight: 30, fontWeight: '700', color: 'white' },
  subtitle: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.86)', maxWidth: 285 },

  card: { marginTop: -42, marginHorizontal: 14, padding: 22, paddingBottom: 20, borderRadius: 14, backgroundColor: 'white', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6 },

  alertError: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca', padding: 9, borderRadius: 6, marginBottom: 14 },
  alertErrorText: { fontSize: 11, color: colors.dangerText },

  heading: { marginBottom: 20 },
  kicker: { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 1.4 },
  cardTitle: { marginTop: 5, fontSize: 22, fontWeight: '700', color: colors.text },
  cardSubtitle: { marginTop: 4, fontSize: 12, color: colors.textSubtle },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  input: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 9, backgroundColor: colors.surfaceMuted, fontSize: 13, color: colors.textDark },

  submit: { marginTop: 5, padding: 13, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 13, fontWeight: '700' },
});