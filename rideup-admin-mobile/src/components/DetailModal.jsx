import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthImage from './AuthImage';
import { Text } from './Typography';

/**
 * Màn chi tiết hồ sơ: đầy đủ thông tin + ảnh giấy tờ, có nút Duyệt / Từ chối.
 * rows: [[nhãn, giá trị], ...]   images: [{ label, path }, ...]
 */
export default function DetailModal({ visible, title, rows, images, onClose, onApprove, onReject }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Text variant="titleMedium" style={styles.title}>{title}</Text>
          <IconButton icon="close" iconColor="#fff" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={styles.card}>
            {(rows || []).map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text variant="bodySmall" style={styles.rowLabel}>{label}</Text>
                <Text variant="bodyMedium" style={styles.rowValue}>
                  {value === null || value === undefined || value === '' ? '—' : String(value)}
                </Text>
              </View>
            ))}
          </View>

          <Text variant="titleSmall" style={styles.section}>Ảnh giấy tờ</Text>
          <View style={styles.card}>
            {(images || []).map((im) => (
              <AuthImage key={im.label} label={im.label} path={im.path} />
            ))}
          </View>
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
          <Button mode="outlined" textColor="#dc2626" style={{ flex: 1 }} onPress={onReject}>Từ chối</Button>
          <Button mode="contained" buttonColor="#10b981" style={{ flex: 1 }} onPress={onApprove}>Duyệt</Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  title: { color: '#fff', fontWeight: '700', flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  rowLabel: { width: 120, color: '#64748b' },
  rowValue: { flex: 1, color: '#0f172a' },
  section: { fontWeight: '700', marginBottom: 8, marginTop: 4, color: '#334155' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff' },
});
