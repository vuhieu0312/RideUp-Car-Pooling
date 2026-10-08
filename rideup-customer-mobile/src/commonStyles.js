import { StyleSheet } from 'react-native';
import { colors, FONT, shadow } from './theme';

/**
 * Bộ style CHUNG dùng cho mọi screen trong app.
 * Mục đích: đảm bảo font, kích thước, màu, shadow, border-radius đồng nhất
 * giữa customer + driver, và giữa tất cả các màn (Home, MyBookings, Profile, ...).
 *
 * Mỗi màn có thể import và spread:
 *   const styles = StyleSheet.create({ ...commonStyles, myCustom: {...} });
 *   <Text style={commonStyles.title}>...</Text>
 *
 * Hoặc dùng trực tiếp: <Text style={[commonStyles.title, { color: 'red' }]}>...
 */
export const commonStyles = StyleSheet.create({
  /* ---------- Layout ---------- */
  container: { flex: 1, backgroundColor: colors.bg },

  /* ---------- Header (kicker + title + action) ---------- */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  kicker: {
    fontFamily: FONT[800],
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryAccent,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: FONT[700],
    marginTop: 3,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontFamily: FONT[400],
    marginTop: 2,
    fontSize: 12,
    color: colors.textSubtle,
  },
  headerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionIcon: {
    color: colors.primaryAccent,
    fontSize: 19,
    fontWeight: '700',
  },

  /* ---------- Card ---------- */
  card: {
    marginBottom: 9,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e3ece8',
    borderRadius: 10,
    backgroundColor: 'white',
    ...shadow(2, 0.07, 7),
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },

  /* ---------- Filter chip (pill) ---------- */
  filters: { marginTop: 10, marginBottom: 10, flexGrow: 0 },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  filter: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 30,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1ebe7',
    borderRadius: 14,
    backgroundColor: 'white',
  },
  filterActive: { borderColor: colors.primaryAccent, backgroundColor: colors.primaryLight },
  filterText: { fontFamily: FONT[500], fontSize: 11, lineHeight: 14, color: colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: colors.primaryAccent, fontWeight: '500' },
  filterCount: { fontSize: 10, lineHeight: 13, fontWeight: '500' },

  /* ---------- Button ---------- */
  primaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignSelf: 'center',
  },
  primaryBtnText: { fontFamily: FONT[700], color: 'white', fontSize: 12, fontWeight: '700' },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.primaryAccent,
    alignSelf: 'center',
  },
  secondaryBtnText: { fontFamily: FONT[700], color: colors.primaryAccent, fontSize: 12, fontWeight: '700' },
  dangerBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerBtnText: { fontFamily: FONT[700], color: colors.danger, fontSize: 11, fontWeight: '700' },

  /* ---------- Form field ---------- */
  fieldLabel: {
    fontFamily: FONT[600],
    marginTop: 12,
    marginBottom: 4,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  helperText: { fontSize: 10, color: colors.textSubtle, marginTop: 2 },

  /* ---------- Empty / Loading ---------- */
  emptyBox: {
    padding: 38,
    borderRadius: 10,
    backgroundColor: 'white',
    color: colors.textSubtle,
    fontSize: 12,
    textAlign: 'center',
  },
  muted: { color: colors.textSubtle, fontSize: 12 },
  loadingText: { textAlign: 'center', padding: 24, color: colors.textSubtle, fontSize: 12 },

  /* ---------- Status badge ---------- */
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontFamily: FONT[700], fontSize: 10, fontWeight: '700' },

  /* ---------- Separator ---------- */
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },

  /* ---------- Metrics row (3 cột label + value) ---------- */
  metrics: { flexDirection: 'row', gap: 24 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, color: colors.textSubtle, marginBottom: 2 },
  metricValue: { fontFamily: FONT[700], fontSize: 12, fontWeight: '700' },

  /* ---------- List ---------- */
  listContent: { padding: 12, paddingBottom: 24 },
});

export default commonStyles;
