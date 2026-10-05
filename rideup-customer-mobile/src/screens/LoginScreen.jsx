import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';

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
      // Chỉ cho CUSTOMER role. Không tiết lộ role cho attacker.
      if (!user.roles?.includes('CUSTOMER')) {
        throw new Error('Email hoặc mật khẩu không đúng');
      }
      // AppNavigator sẽ tự động chuyển sang Main stack vì user state đã đổi.
    } catch (e) {
      setError('Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text variant="displaySmall" style={styles.brand}>RIDEUP</Text>
          <Text variant="headlineMedium" style={styles.title}>
            Đi cùng nhau,{'\n'}đi xa hơn.
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Đặt chuyến nhanh, giá rõ ràng và tài xế đã xác minh.
          </Text>
        </View>

        <View style={styles.card}>
          <Text variant="labelLarge" style={styles.kicker}>KHÁCH HÀNG</Text>
          <Text variant="headlineSmall" style={styles.cardTitle}>Chào mừng trở lại</Text>
          <Text variant="bodyMedium" style={styles.cardSubtitle}>
            Đăng nhập để tiếp tục hành trình của bạn.
          </Text>

          {!!error && <HelperText type="error" visible>{error}</HelperText>}

          <TextInput
            mode="outlined"
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={submit}
            loading={loading}
            disabled={loading}
            style={styles.submit}
            contentStyle={{ paddingVertical: 6 }}
          >
            Đăng nhập
          </Button>

          <View style={styles.switchRow}>
            <Text variant="bodyMedium">Chưa có tài khoản? </Text>
            <Text
              variant="bodyMedium"
              style={styles.link}
              onPress={() => navigation.navigate('Register')}
            >
              Đăng ký ngay
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f9fafb' },
  hero: { marginTop: 40, marginBottom: 24 },
  brand: { color: '#10b981', fontWeight: '700', letterSpacing: 4 },
  title: { marginTop: 12, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  kicker: { color: '#10b981', letterSpacing: 2 },
  cardTitle: { marginTop: 6, fontWeight: '700' },
  cardSubtitle: { marginTop: 4, color: '#6b7280', marginBottom: 16 },
  input: { marginBottom: 8 },
  submit: { marginTop: 16, borderRadius: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  link: { color: '#10b981', fontWeight: '600' },
});