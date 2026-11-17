import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';
import { Text } from './Typography';

const CATEGORIES = [
  ['SAFETY', 'An toàn'],
  ['HARASSMENT', 'Quấy rối'],
  ['FRAUD', 'Gian lận'],
  ['PROPERTY_DAMAGE', 'Hư hỏng tài sản'],
  ['OTHER', 'Khác'],
];

const EMPTY_FORM = { category: '', title: '', description: '', evidenceUrl: '' };
const FIELD_LABELS = {
  category: 'Loại khiếu nại',
  title: 'Tiêu đề',
  description: 'Nội dung',
  evidenceUrl: 'Bằng chứng',
};

export default function ComplaintFormModal({ visible, submitting, error, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      setForm(EMPTY_FORM);
      setErrors({});
    }
  }, [visible]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function submit() {
    const nextErrors = {};
    Object.keys(FIELD_LABELS).forEach((field) => {
      if (!String(form[field] || '').trim()) nextErrors[field] = `${FIELD_LABELS[field]} là trường bắt buộc.`;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit({
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      evidenceUrl: form.evidenceUrl.trim(),
    });
  }

  function label(field) {
    return (
      <Text style={styles.label}>
        {FIELD_LABELS[field]} <Text style={styles.required}>*</Text>
      </Text>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Gửi khiếu nại</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              {label('category')}
              <View style={styles.categories}>
                {CATEGORIES.map(([value, name]) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.category, form.category === value && styles.categorySelected]}
                    onPress={() => update('category', value)}
                    disabled={submitting}
                  >
                    <Text style={[styles.categoryText, form.category === value && styles.categoryTextSelected]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!errors.category && <Text style={styles.fieldError}>{errors.category}</Text>}
            </View>

            <View style={styles.field}>
              {label('title')}
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(value) => update('title', value)}
                placeholder="Nhập tiêu đề khiếu nại"
                maxLength={255}
                editable={!submitting}
              />
              {!!errors.title && <Text style={styles.fieldError}>{errors.title}</Text>}
            </View>

            <View style={styles.field}>
              {label('description')}
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.description}
                onChangeText={(value) => update('description', value)}
                placeholder="Mô tả chi tiết sự việc"
                multiline
                textAlignVertical="top"
                editable={!submitting}
              />
              {!!errors.description && <Text style={styles.fieldError}>{errors.description}</Text>}
            </View>

            <View style={styles.field}>
              {label('evidenceUrl')}
              <TextInput
                style={styles.input}
                value={form.evidenceUrl}
                onChangeText={(value) => update('evidenceUrl', value)}
                placeholder="Nhập đường dẫn ảnh/video bằng chứng"
                autoCapitalize="none"
                keyboardType="url"
                maxLength={500}
                editable={!submitting}
              />
              {!!errors.evidenceUrl && <Text style={styles.fieldError}>{errors.evidenceUrl}</Text>}
            </View>
          </ScrollView>

          {!!error && <Text style={styles.formError}>{error}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelText}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabled]}
              onPress={submit}
              disabled={submitting}
            >
              <Text style={styles.submitText}>{submitting ? 'Đang gửi...' : 'Xác nhận'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', padding: 20 },
  modal: { maxHeight: '90%', width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, borderRadius: 16, backgroundColor: colors.surface },
  title: { marginBottom: 16, fontSize: 18, fontWeight: '700', color: colors.text },
  field: { marginBottom: 14 },
  label: { marginBottom: 6, fontSize: 12, fontWeight: '700', color: colors.textDark },
  required: { color: colors.dangerText },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  category: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  categorySelected: { borderColor: colors.primaryAccent, backgroundColor: colors.primaryLight },
  categoryText: { fontSize: 11, color: colors.textMuted },
  categoryTextSelected: { color: colors.primaryAccent, fontWeight: '700' },
  input: { minHeight: 42, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: '#fff', fontSize: 13, color: colors.text },
  multiline: { minHeight: 90 },
  fieldError: { marginTop: 4, fontSize: 10, color: colors.dangerText },
  formError: { marginTop: 8, fontSize: 11, color: colors.dangerText },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 16 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, backgroundColor: '#f1f5f9' },
  cancelText: { color: colors.textDark, fontSize: 12, fontWeight: '600' },
  submitButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primary },
  disabled: { opacity: 0.55 },
  submitText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
