import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Snackbar, Text, TextInput } from 'react-native-paper';
import { changePassword } from '../api/api';
import { colors } from '../theme';

/**
 * Màn đổi mật khẩu — yêu cầu mật khẩu cũ để xác nhận.
 * Validate client: mật khẩu mới ≥ 6 ký tự + xác nhận khớp.
 * BE sẽ verify oldPassword và re-hash newPassword.
 */
export default function ChangePasswordScreen({ navigation }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ old: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    if (!form.oldPassword) return 'Vui lòng nhập mật khẩu hiện tại';
    if (!form.newPassword) return 'Vui lòng nhập mật khẩu mới';
    if (form.newPassword.length < 6) return 'Mật khẩu mới phải có ít nhất 6 ký tự';
    if (form.newPassword === form.oldPassword) return 'Mật khẩu mới phải khác mật khẩu hiện tại';
    if (form.newPassword !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp';
    return '';
  }

  async function save() {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setSnack('Đổi mật khẩu thành công');
      setTimeout(() => navigation.goBack(), 800);
    } catch (e) {
      setError(e.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" iconColor={colors.text} onPress={() => navigation.goBack()} />
        <View>
          <Text style={styles.kicker}>BẢO MẬT</Text>
          <Text style={styles.title}>Đổi mật khẩu</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <HelperText type="info" visible style={{ marginBottom: 8 }}>
          Mật khẩu mới phải có ít nhất 6 ký tự và khác mật khẩu hiện tại.
        </HelperText>

        <Text style={styles.label}>Mật khẩu hiện tại *</Text>
        <TextInput
          mode="outlined"
          value={form.oldPassword}
          onChangeText={setField('oldPassword')}
          secureTextEntry={!show.old}
          autoCapitalize="none"
          autoCorrect={false}
          right={<TextInput.Icon icon={show.old ? 'eye-off' : 'eye'} onPress={() => setShow((s) => ({ ...s, old: !s.old }))} />}
          style={styles.input}
          outlineColor={colors.borderLight}
          activeOutlineColor={colors.primaryAccent}
        />

        <Text style={styles.label}>Mật khẩu mới *</Text>
        <TextInput
          mode="outlined"
          value={form.newPassword}
          onChangeText={setField('newPassword')}
          secureTextEntry={!show.new}
          autoCapitalize="none"
          autoCorrect={false}
          right={<TextInput.Icon icon={show.new ? 'eye-off' : 'eye'} onPress={() => setShow((s) => ({ ...s, new: !s.new }))} />}
          style={styles.input}
          outlineColor={colors.borderLight}
          activeOutlineColor={colors.primaryAccent}
        />

        <Text style={styles.label}>Xác nhận mật khẩu mới *</Text>
        <TextInput
          mode="outlined"
          value={form.confirmPassword}
          onChangeText={setField('confirmPassword')}
          secureTextEntry={!show.confirm}
          autoCapitalize="none"
          autoCorrect={false}
          right={<TextInput.Icon icon={show.confirm ? 'eye-off' : 'eye'} onPress={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} />}
          style={styles.input}
          outlineColor={colors.borderLight}
          activeOutlineColor={colors.primaryAccent}
        />

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

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
          {saving ? 'Đang đổi...' : 'Đổi mật khẩu'}
        </Button>
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 4 },
  kicker: { fontSize: 9, color: colors.primaryAccent, letterSpacing: 1.5, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  content: { padding: 14, paddingBottom: 40 },
  label: { marginTop: 12, marginBottom: 4, fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  input: { backgroundColor: 'white', fontSize: 13 },
  saveBtn: { marginTop: 24, borderRadius: 9 },
});
