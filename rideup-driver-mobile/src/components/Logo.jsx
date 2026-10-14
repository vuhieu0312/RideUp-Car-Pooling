import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Typography';
import { FONT } from '../theme';

/** Logo RideUp dùng chung 3 app: ô bo góc chứa icon xe + wordmark "RIDEUP". */
const SIZES = {
  md: { box: 26, icon: 16, font: 11, gap: 8 },
  sm: { box: 22, icon: 14, font: 10, gap: 7 },
};

export default function Logo({ size = 'md', tag, tone = 'light', style }) {
  const s = SIZES[size] || SIZES.md;
  const dark = tone === 'dark';
  const fg = dark ? '#17312c' : '#ffffff';
  return (
    <View
      style={[styles.row, { gap: s.gap }, style]}
      accessibilityRole="header"
      accessibilityLabel={tag ? `RideUp ${tag}` : 'RideUp'}
    >
      <View
        style={[
          styles.mark,
          { width: s.box, height: s.box, borderRadius: Math.round(s.box * 0.3) },
          dark ? styles.markDark : styles.markLight,
        ]}
      >
        <MaterialCommunityIcons name="car-side" size={s.icon} color={fg} />
      </View>
      <Text style={{ fontFamily: FONT[800], fontSize: s.font, letterSpacing: 2, color: fg }}>RIDEUP</Text>
      {!!tag && (
        <>
          <View style={[styles.divider, { height: s.font + 3, backgroundColor: dark ? 'rgba(23,49,44,0.25)' : 'rgba(255,255,255,0.45)' }]} />
          <Text style={{ fontFamily: FONT[700], fontSize: s.font - 1, letterSpacing: 1.5, color: fg, opacity: 0.8 }}>{tag}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  mark: { alignItems: 'center', justifyContent: 'center' },
  markLight: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  markDark: { backgroundColor: 'rgba(12,175,99,0.12)', borderWidth: 1, borderColor: 'rgba(12,175,99,0.25)' },
  divider: { width: 1 },
});
