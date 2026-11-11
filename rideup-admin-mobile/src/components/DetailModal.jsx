import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthImage from './AuthImage';
import IconText from './IconText';
import { Text } from './Typography';

// sections: [{ title, rows: [[nhãn, giá trị]] }], imageGroups: [{ title, images: [{ label, path }] }]
export default function DetailModal({
  visible, title, rows, sections, images, imageGroups, warnings, onClose, onApprove, onReject,
}) {
  const insets = useSafeAreaInsets();
  const allSections = sections || [{ title: null, rows: rows || [] }];
  const allImageGroups = imageGroups || [{ title: 'Ảnh giấy tờ', images: images || [] }];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Text variant="titleMedium" style={styles.title}>{title}</Text>
          <IconButton icon="close" iconColor="#fff" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {!!warnings?.length && (
            <View style={styles.warnBox}>
              {warnings.map((w) => (
                <IconText key={w} name="alert-outline" size={16} color="#92400e" textStyle={{ color: '#92400e' }} style={{ marginBottom: 4 }}>
                  {w}
                </IconText>
              ))}
            </View>
          )}

          {allSections.map((sec, i) => (
            <View key={sec.title || i}>
              {!!sec.title && <Text variant="titleSmall" style={styles.section}>{sec.title}</Text>}
              <View style={styles.card}>
                {sec.rows.map(([label, value]) => (
                  <View key={label} style={styles.row}>
                    <Text variant="bodySmall" style={styles.rowLabel}>{label}</Text>
                    <Text variant="bodyMedium" style={styles.rowValue}>
                      {value === null || value === undefined || value === '' ? '—' : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {allImageGroups.map((g) => (
            <View key={g.title}>
              <Text variant="titleSmall" style={styles.section}>{g.title}</Text>
              <View style={styles.card}>
                {g.images.map((im) => (
                  <AuthImage key={im.label} label={im.label} path={im.path} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {(onApprove || onReject) && (
          <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
            {onReject && <Button mode="outlined" textColor="#dc2626" style={{ flex: 1 }} onPress={onReject}>Từ chối</Button>}
            {onApprove && <Button mode="contained" buttonColor="#10b981" style={{ flex: 1 }} onPress={onApprove}>Duyệt</Button>}
          </View>
        )}
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
  warnBox: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff' },
});
