import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';

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
      // AppNavigator sẽ tự chuyển sang Dashboard
    } catch (e) {
      setError('Email hoặc mật khẩu không đúng');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text variant="labelLarge" style={styles.brand}>RIDEUP · ADMIN</Text>
          <Text variant="headlineSmall" style={styles.title}>🛡️ Đăng nhập quản trị</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Dành cho quản trị viên. Tài xế/khách dùng app phù hợp.</Text>
        </View>

        <View style={styles.card}>
          {!!error && <HelperText type="error" visible>{error}</HelperText>}
          <TextInput mode="outlined" label="Email" value={email}
            onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
            style={styles.input} />
          <TextInput mode="outlined" label="Mật khẩu" value={password}
            onChangeText={setPassword} secureTextEntry style={styles.input} />
          <Button mode="contained" onPress={submit} loading={loading} disabled={loading}
            style={styles.submit} contentStyle={{ paddingVertical: 6 }}>
            Đăng nhập
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f1f5f9' },
  hero: { marginTop: 60, marginBottom: 24 },
  brand: { color: '#1e293b', letterSpacing: 2, fontWeight: '700' },
  title: { marginTop: 12, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  input: { marginBottom: 8 },
  submit: { marginTop: 16, borderRadius: 12 },
});