import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';
import { updateMyProfile } from '../api/api';
import { colors, FONT } from '../theme';
import DateField from '../components/DateField';

const GENDERS = [
  { value: 'MALE', label: 'Nam', icon: 'gender-male' },
  { value: 'FEMALE', label: 'Nữ', icon: 'gender-female' },
  { value: 'OTHER', label: 'Khác', icon: 'account-question-outline' },
];

/**
 * Màn sửa thông tin cá nhân — đổi họ tên / SĐT / ngày sinh / giới tính.
 * Email khóa (read-only) vì là login key.
 */
export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phoneNumber || user?.phone || '',
    dateOfBirth: user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
    gender: user?.gender || 'MALE',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên';
    if (form.phone && !/^(0|\+84)[0-9]{9,11}$/.test(form.phone)) return 'Số điện thoại không hợp lệ';
    return '';
  }

  async function save() {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      const body = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
      };
      const updated = await updateMyProfile(body);
      await updateUser(updated);
      navigation.goBack();
    } catch (e) {
      setError(e.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" iconColor={colors.textDark} onPress={() => navigation.goBack()} />
        <View>
          <Text style={styles.kicker}>CHỈNH SỬA</Text>
          <Text style={styles.title}>Thông tin cá nhân</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Họ và tên *</Text>
        <TextInput
          mode="outlined"
          value={form.fullName}
          onChangeText={set('fullName')}
          placeholder="Nguyễn Văn A"
          style={styles.input}
          outlineColor={colors.borderLight}
          activeOutlineColor={colors.primaryAccent}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          mode="outlined"
          value={user?.email || ''}
          editable={false}
          right={<TextInput.Icon icon="lock-outline" />}
          style={styles.input}
        />
        <HelperText type="info" visible style={{ marginTop: -8 }}>Email là tài khoản đăng nhập, không thể thay đổi.</HelperText>

        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput
          mode="outlined"
          value={form.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
          placeholder="0901234567"
          style={styles.input}
          outlineColor={colors.borderLight}
          activeOutlineColor={colors.primaryAccent}
        />

        <Text style={styles.label}>Ngày sinh</Text>
        <DateField value={form.dateOfBirth} onChange={set('dateOfBirth')} placeholder="Chọn ngày sinh" />

        <Text style={[styles.label, { marginTop: 14 }]}>Giới tính</Text>
        <SegmentedButtons
          value={form.gender}
          onValueChange={set('gender')}
          buttons={GENDERS.map((g) => ({ value: g.value, label: g.label, icon: g.icon }))}
          theme={{ colors: { secondaryContainer: colors.primaryFaintest, onSecondaryContainer: colors.primaryAccent } }}
        />

        {!!error && (
          <HelperText type="error" visible style={{ marginTop: 12 }}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={save}
          loading={saving}
          disabled={saving}
          buttonColor={colors.primary}
          textColor="#fff"
          style={styles.saveBtn}
          contentStyle={{ paddingVertical: 6 }}
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 4 },
  kicker: { fontFamily: FONT[800], fontSize: 9, color: colors.primaryAccent, letterSpacing: 1.5, fontWeight: '800' },
  title: { fontFamily: FONT[700], fontSize: 16, fontWeight: '700', color: colors.textDark, marginTop: 2 },

  content: { padding: 14, paddingBottom: 40 },
  label: { marginTop: 12, marginBottom: 4, fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  input: { backgroundColor: 'white', fontSize: 13 },
  saveBtn: { marginTop: 24, borderRadius: 9 },
});
