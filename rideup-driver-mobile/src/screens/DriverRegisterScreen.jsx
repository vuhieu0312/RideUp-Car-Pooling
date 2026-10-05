import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { registerDriver } from '../api/api';

/**
 * Driver KYC registration. Upload 3 ảnh qua expo-image-picker (camera hoặc library).
 * RN FormData nhận object {uri, name, type} — khác với web FormData (File blob).
 */
export default function DriverRegisterScreen() {
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

  async function pickImage(key) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setFiles((p) => ({ ...p, [key]: { uri: a.uri, name: a.fileName || `${key}.jpg`, type: a.mimeType || 'image/jpeg' } }));
    }
  }

  async function captureImage(key) {
    await ImagePicker.requestCameraPermissionsAsync();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
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
      await registerDriver(form, files);
      // Backend đã issue token + login. AuthContext sẽ tự chuyển sang Main stack.
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký thất bại');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text variant="labelLarge" style={styles.kicker}>TÀI XẾ</Text>
          <Text variant="headlineSmall" style={styles.title}>Đăng ký hồ sơ</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Admin sẽ duyệt hồ sơ trước khi bạn bắt đầu nhận chuyến.</Text>
        </View>

        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.section}>1. Thông tin cá nhân</Text>
            <TextInput mode="outlined" label="Họ và tên *" value={form.fullName} onChangeText={set('fullName')} style={styles.input} />
            <TextInput mode="outlined" label="Email *" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput mode="outlined" label="Số điện thoại *" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" style={styles.input} />
            <TextInput mode="outlined" label="Mật khẩu (≥ 8 ký tự) *" value={form.password} onChangeText={set('password')} secureTextEntry style={styles.input} />
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.section}>2. Giấy tờ tùy thân</Text>
            <TextInput mode="outlined" label="Số CCCD (12 số) *" value={form.cccd} onChangeText={set('cccd')} keyboardType="numeric" maxLength={12} style={styles.input} />
            <TextInput mode="outlined" label="Số GPLX *" value={form.gplx} onChangeText={set('gplx')} style={styles.input} />
            <TextInput mode="outlined" label="Ngày hết hạn GPLX *" value={form.gplxExpiryDate} onChangeText={set('gplxExpiryDate')} placeholder="2030-12-31" style={styles.input} />
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.section}>3. Ảnh giấy tờ</Text>
            <ImageField label="CCCD mặt trước *" file={files.cccdImageFront} onPick={() => pickImage('cccdImageFront')} onCapture={() => captureImage('cccdImageFront')} />
            <ImageField label="CCCD mặt sau *" file={files.cccdImageBack} onPick={() => pickImage('cccdImageBack')} onCapture={() => captureImage('cccdImageBack')} />
            <ImageField label="GPLX *" file={files.gplxImage} onPick={() => pickImage('gplxImage')} onCapture={() => captureImage('gplxImage')} />
          </Card.Content>
        </Card>

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <Button mode="contained" onPress={submit} loading={loading} disabled={loading}
          style={{ marginTop: 16, borderRadius: 12 }} contentStyle={{ paddingVertical: 6 }}>
          Gửi hồ sơ đăng ký
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ImageField({ label, file, onPick, onCapture }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text variant="labelSmall" style={{ color: '#6b7280', marginBottom: 4 }}>{label}</Text>
      {file?.uri ? (
        <View>
          <Image source={{ uri: file.uri }} style={{ width: '100%', height: 180, borderRadius: 8 }} />
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Button mode="outlined" onPress={onPick} style={{ flex: 1, marginRight: 4 }} icon="image">Đổi</Button>
            <Button mode="outlined" onPress={onCapture} style={{ flex: 1, marginLeft: 4 }} icon="camera">Chụp lại</Button>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Button mode="outlined" onPress={onPick} style={{ flex: 1, marginRight: 4 }} icon="image">Chọn ảnh</Button>
          <Button mode="outlined" onPress={onCapture} style={{ flex: 1, marginLeft: 4 }} icon="camera">Chụp ảnh</Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: '#f9fafb' },
  hero: { marginTop: 40, marginBottom: 16 },
  kicker: { color: '#08b85c', letterSpacing: 2 },
  title: { marginTop: 6, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  section: { fontWeight: '700', marginBottom: 8 },
  input: { marginBottom: 8 },
});