import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

/**
 * Placeholder cho các tab chưa implement (Tin nhắn / Thông báo / Tài khoản).
 * Truyền `title`, `icon`, `subtitle` qua route params.
 */
export default function PlaceholderScreen({ route }) {
  const { title, icon = 'star-outline', subtitle = 'Tính năng đang được phát triển' } = route.params || {};
  const { user, doLogout } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroIcon}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.primaryAccent} />
      </View>
      <Text variant="titleLarge" style={styles.title}>{title || 'Sắp ra mắt'}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {user && (
        <View style={styles.card}>
          <Text variant="labelLarge" style={styles.kicker}>TÀI KHOẢN</Text>
          <Text style={styles.name}>{user.fullName || user.email || 'Người dùng'}</Text>
          {!!user.email && <Text style={styles.muted}>{user.email}</Text>}
          {!!user.phone && <Text style={styles.muted}>{user.phone}</Text>}

          <View style={styles.actions}>
            <View style={styles.actionRow}>
              <MaterialCommunityIcons name="cog-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionText}>Cài đặt</Text>
            </View>
            <View style={styles.actionRow}>
              <MaterialCommunityIcons name="help-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionText}>Hỗ trợ</Text>
            </View>
            <View style={[styles.actionRow, styles.actionDanger]} onTouchEnd={doLogout}>
              <MaterialCommunityIcons name="logout" size={18} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Đăng xuất</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', backgroundColor: colors.bg, flexGrow: 1 },
  heroIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primaryFaintest,
    alignItems: 'center', justifyContent: 'center', marginTop: 32,
  },
  title: { marginTop: 16, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: 6, fontSize: 12, color: colors.textSubtle, textAlign: 'center' },

  card: {
    width: '100%', marginTop: 28, padding: 16, borderRadius: 12,
    backgroundColor: 'white', borderWidth: 1, borderColor: colors.border,
  },
  kicker: { fontSize: 9, color: colors.primaryAccent, letterSpacing: 1.5, fontWeight: '800' },
  name: { marginTop: 8, fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { marginTop: 2, fontSize: 11, color: colors.textSubtle },
  actions: { marginTop: 16, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  actionText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  actionDanger: { borderBottomWidth: 0 },
});