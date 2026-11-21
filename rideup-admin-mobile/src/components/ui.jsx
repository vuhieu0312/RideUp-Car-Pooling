import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Typography';
import { FONT, accent, colors, radius, shadow } from '../theme';
import { useLayout } from '../utils/useLayout';

export const TONES = {
  success: { bg: colors.successBg, fg: colors.successDark },
  warning: { bg: colors.pendingBg, fg: '#92400e' },
  danger: { bg: colors.dangerBg, fg: colors.dangerText },
  info: { bg: '#dbeafe', fg: '#1e40af' },
  neutral: { bg: '#e2e8f0', fg: '#334155' },
};

export function Pill({ tone = 'neutral', icon, children, style }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      {!!icon && <MaterialCommunityIcons name={icon} size={12} color={t.fg} />}
      <Text style={{ fontFamily: FONT[700], fontSize: 11, color: t.fg }}>{children}</Text>
    </View>
  );
}

export function Panel({ children, style }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Avatar({ label, icon, color = accent.blue, size = 40 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22' }]}>
      {icon
        ? <MaterialCommunityIcons name={icon} size={size * 0.5} color={color} />
        : <Text style={{ fontFamily: FONT[800], fontSize: size * 0.42, color }}>{label}</Text>}
    </View>
  );
}

export function StatGrid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

export function StatCard({ icon, label, value, color = accent.green, sub }) {
  const { wide } = useLayout();
  return (
    <View style={[styles.stat, wide && styles.statWide]}>
      <View style={[styles.statIcon, { backgroundColor: color + '1a' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      {!!sub && <Text style={styles.statSub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

export function CardGrid({ children }) {
  const { wide } = useLayout();
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  if (!wide) return <View>{items}</View>;
  return (
    <View style={styles.cardGrid}>
      {items.map((child, i) => (
        <View key={child.key ?? i} style={styles.cardGridItem}>{child}</View>
      ))}
    </View>
  );
}

export function Segmented({ options, value, onChange, style }) {
  const { wide } = useLayout();
  return (
    <View style={[styles.segmented, wide && styles.segmentedWide, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} style={[styles.segItem, active && styles.segItemActive]} onPress={() => onChange(o.value)}>
            <Text style={[styles.segText, active && styles.segTextActive]} numberOfLines={1}>{o.label}</Text>
            {o.badge > 0 && (
              <View style={[styles.segBadge, active && { backgroundColor: colors.danger }]}>
                <Text style={styles.segBadgeText}>{o.badge}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, count, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count != null && (
        <View style={[styles.chipCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={[styles.chipCountText, active && { color: '#fff' }]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function EmptyState({ icon = 'inbox-outline', text }) {
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name={icon} size={34} color="#cbd5e1" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function RankList({ rows, renderValue, emptyText }) {
  if (!rows.length) return <EmptyState icon="trophy-outline" text={emptyText} />;
  return (
    <View>
      {rows.map((row, i) => (
        <View key={row.key || i} style={[styles.rankRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={[styles.rankBadge, i < 3 && { backgroundColor: ['#fef3c7', '#e2e8f0', '#fde4cf'][i] }]}>
            <Text style={[styles.rankNum, i < 3 && { color: ['#b45309', '#475569', '#c2410c'][i] }]}>{i + 1}</Text>
          </View>
          <Text style={styles.rankName} numberOfLines={1}>{row.name}</Text>
          <Text style={styles.rankValue}>{renderValue(row)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  panel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 12, ...shadow(2, 0.06, 10) },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontFamily: FONT[800], fontSize: 15, color: colors.text },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, ...shadow(2, 0.06, 10) },
  statWide: { flexBasis: '22%' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, alignItems: 'flex-start' },
  cardGridItem: { flexBasis: '48.5%', flexGrow: 1, maxWidth: '100%' },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel: { fontFamily: FONT[500], fontSize: 12, color: colors.textMuted },
  statValue: { fontFamily: FONT[800], fontSize: 22, color: colors.text, marginTop: 2 },
  statSub: { fontFamily: FONT[500], fontSize: 11, color: colors.textMuted, marginTop: 2 },
  segmented: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 3, marginBottom: 14 },
  segmentedWide: { alignSelf: 'flex-start', width: 400 },
  segItem: { flex: 1, flexBasis: 0, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  segItemActive: { backgroundColor: colors.surface, ...shadow(1, 0.1, 4) },
  segText: { fontFamily: FONT[600], fontSize: 12, color: '#64748b' },
  segTextActive: { fontFamily: FONT[800], color: colors.text },
  segBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' },
  segBadgeText: { fontFamily: FONT[800], fontSize: 10, color: '#fff' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: FONT[600], fontSize: 12, color: '#475569' },
  chipTextActive: { color: '#fff' },
  chipCount: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontFamily: FONT[700], fontSize: 10, color: '#475569' },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontFamily: FONT[500], fontSize: 13, color: '#94a3b8' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontFamily: FONT[800], fontSize: 12, color: '#64748b' },
  rankName: { flex: 1, fontFamily: FONT[600], fontSize: 13, color: colors.text },
  rankValue: { fontFamily: FONT[800], fontSize: 13, color: colors.text },
});
