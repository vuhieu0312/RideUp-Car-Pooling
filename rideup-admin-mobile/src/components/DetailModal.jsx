import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthImage from './AuthImage';
import IconText from './IconText';
import { Text } from './Typography';
import { FONT, accent, colors, radius, shadow } from '../theme';
import { useLayout } from '../utils/useLayout';

export default function DetailModal({
  visible, title, rows, sections, images, imageGroups, warnings, onClose, onApprove, onReject,
}) {
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const allSections = sections || [{ title: null, rows: rows || [] }];
  const allImageGroups = imageGroups || [{ title: 'Ảnh giấy tờ', images: images || [] }];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>{title}</Text>
          <IconButton icon="close" iconColor="#fff" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={[{ padding: 16, paddingBottom: 24 }, wide && { width: '100%', maxWidth: 820, alignSelf: 'center' }]}>
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
              {!!sec.title && <Text style={styles.section}>{sec.title}</Text>}
              <View style={styles.card}>
                {sec.rows.map(([label, value]) => (
                  <View key={label} style={styles.row}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowValue}>
                      {value === null || value === undefined || value === '' ? '—' : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {allImageGroups.map((g) => (
            <View key={g.title}>
              <Text style={styles.section}>{g.title}</Text>
              <View style={styles.card}>
                {g.images.map((im) => (
                  <AuthImage key={im.label} label={im.label} path={im.path} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {(onApprove || onReject) && (
          <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }, wide && { justifyContent: 'center' }]}>
            {onReject && <Button mode="outlined" textColor={colors.danger} style={{ flex: 1, maxWidth: wide ? 240 : undefined }} onPress={onReject}>Từ chối</Button>}
            {onApprove && <Button mode="contained" buttonColor={accent.green} style={{ flex: 1, maxWidth: wide ? 240 : undefined }} onPress={onApprove}>Duyệt</Button>}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  title: { fontFamily: FONT[800], fontSize: 18, color: '#fff', flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 14, ...shadow(2, 0.06, 10) },
  row: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  rowLabel: { width: 120, fontFamily: FONT[500], fontSize: 12, color: colors.textMuted },
  rowValue: { flex: 1, fontFamily: FONT[600], fontSize: 13, color: colors.text },
  section: { fontFamily: FONT[800], fontSize: 13, marginBottom: 8, marginTop: 4, color: '#475569', textTransform: 'uppercase' },
  warnBox: { backgroundColor: colors.pendingBg, borderRadius: radius.md, padding: 12, marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
});
