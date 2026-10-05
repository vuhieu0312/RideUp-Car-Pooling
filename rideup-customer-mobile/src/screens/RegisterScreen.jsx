import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { registerCustomer } from '../api/api';
import { useAuth } from '../auth/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { doLogin } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key) {
    return (value) => setForm((prev) => ({ ...prev, [key]: value }));
  }

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
      // AppNavigator tự chuyển sang Main stack
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký thất bại');
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
          <Text variant="labelLarge" style={styles.kicker}>KHÁCH HÀNG</Text>
          <Text variant="headlineSmall" style={styles.title}>Tạo tài khoản</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Điền thông tin để bắt đầu sử dụng RideUp.
          </Text>
        </View>

        <View style={styles.card}>
          {!!error && <HelperText type="error" visible>{error}</HelperText>}

          <TextInput mode="outlined" label="Họ và tên" value={form.fullName}
            onChangeText={update('fullName')} placeholder="Nguyễn Văn A" style={styles.input} />
          <TextInput mode="outlined" label="Email" value={form.email}
            onChangeText={update('email')} placeholder="you@example.com"
            keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          <TextInput mode="outlined" label="Số điện thoại" value={form.phone}
            onChangeText={update('phone')} placeholder="0912345678"
            keyboardType="phone-pad" style={styles.input} />
          <TextInput mode="outlined" label="Mật khẩu (tối thiểu 8 ký tự)" value={form.password}
            onChangeText={update('password')} placeholder="Nhập mật khẩu"
            secureTextEntry={!showPassword}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            style={styles.input}
          />

          <Button mode="contained" onPress={submit} loading={loading} disabled={loading}
            style={styles.submit} contentStyle={{ paddingVertical: 6 }}>
            Đăng ký
          </Button>

          <View style={styles.switchRow}>
            <Text variant="bodyMedium">Đã có tài khoản? </Text>
            <Text variant="bodyMedium" style={styles.link}
              onPress={() => navigation.navigate('Login')}>
              Đăng nhập
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
  kicker: { color: '#10b981', letterSpacing: 2 },
  title: { marginTop: 6, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  input: { marginBottom: 8 },
  submit: { marginTop: 16, borderRadius: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  link: { color: '#10b981', fontWeight: '600' },
});