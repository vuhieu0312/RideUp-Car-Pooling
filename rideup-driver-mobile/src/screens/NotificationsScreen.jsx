import { useCallback, useState } from 'react';
import { DeviceEventEmitter, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listMyConversations, listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/api';
import { NOTIFICATIONS_CHANGED } from '../hooks/useUnreadNotifications';
import { useRealtimeRefresh } from '../realtime/useRealtime';
import { Text } from '../components/Typography';
import { colors, FONT, shadow } from '../theme';

const GOOD = { icon: 'check-circle-outline', color: '#16a34a' };
const BAD = { icon: 'close-circle-outline', color: '#dc2626' };
const INFO = { icon: 'information-outline', color: '#2563eb' };

const TYPE_STYLE = {
  BOOKING_REQUEST: { icon: 'account-plus-outline', color: '#2563eb' },
  BOOKING_CONFIRMED: GOOD,
  BOOKING_REJECTED: BAD,
  BOOKING_CANCELED: BAD,
  BOOKING_EXPIRED: { icon: 'clock-alert-outline', color: '#d97706' },
  BOOKING_COMPLETED: { icon: 'flag-checkered', color: '#16a34a' },
  PAYMENT_SUCCESS: GOOD,
  PAYMENT_FAILED: BAD,
  TRIP_STARTED: { icon: 'car-arrow-right', color: '#2563eb' },
  TRIP_CANCELED: BAD,
  TRIP_REMINDER: { icon: 'alarm', color: '#d97706' },
  REVIEW_RECEIVED: { icon: 'star-outline', color: '#d97706' },
  CHAT_MESSAGE: { icon: 'message-text-outline', color: '#0a9c5a' },
  DRIVER_APPROVED: GOOD,
  DRIVER_REJECTED: BAD,
  VEHICLE_APPROVED: GOOD,
  VEHICLE_REJECTED: BAD,
  SYSTEM: INFO,
};

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

async function openChat(navigation, item) {
  try {
    const conversations = await listMyConversations();
    const conv = (conversations || []).find((c) => c.bookingId === item.bookingId);
    if (conv) {
      navigation.navigate('AllTripsTab', {
        screen: 'Chat',
        params: { conversationId: conv.conversationId, bookingId: conv.bookingId, name: conv.customerName },
      });
      return;
    }
  } catch { /* rơi về danh sách chuyến */ }
  navigation.navigate('AllTripsTab', { screen: 'AllTrips' });
}

function goToTarget(navigation, item) {
  switch (item.type) {
    case 'CHAT_MESSAGE':
      openChat(navigation, item);
      break;
    case 'BOOKING_REQUEST':
    case 'BOOKING_CANCELED':
      navigation.navigate('AllTripsTab', { screen: 'Bookings' });
      break;
    case 'VEHICLE_APPROVED':
    case 'VEHICLE_REJECTED':
      navigation.navigate('VehicleList');
      break;
    case 'TRIP_CANCELED':
      navigation.navigate('AllTripsTab', { screen: 'AllTrips' });
      break;
    default:
      break;
  }
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    listNotifications(0, 50)
      .then(setItems)
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(load);
  useRealtimeRefresh(load, ['NOTIFICATION_CREATED']);

  async function open(item) {
    if (!item.read) {
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, read: true } : x)));
      try { await markNotificationRead(item.id); } catch { /* lần tải sau sẽ đồng bộ lại */ }
      DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED);
    }
    goToTarget(navigation, item);
  }

  async function readAll() {
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    try { await markAllNotificationsRead(); } catch { /* lần tải sau sẽ đồng bộ lại */ }
    DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED);
  }

  const unread = items.filter((x) => !x.read).length;

  function renderItem({ item }) {
    const st = TYPE_STYLE[item.type] || INFO;
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => open(item)} style={[styles.card, !item.read && styles.cardUnread]}>
        <View style={[styles.iconWrap, { backgroundColor: st.color + '1A' }]}>
          <MaterialCommunityIcons name={st.icon} size={20} color={st.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, !item.read && { fontFamily: FONT[700] }]} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.message} numberOfLines={4}>{item.message}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity onPress={readAll} disabled={unread === 0}>
          <Text style={[styles.readAll, unread === 0 && { opacity: 0.4 }]}>Đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14, paddingBottom: 24, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={loading ? null : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: FONT[700], fontSize: 18, color: colors.text },
  readAll: { fontFamily: FONT[600], fontSize: 13, color: colors.primaryAccent },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'white',
    borderRadius: 12, padding: 12, marginBottom: 10, ...shadow(1, 0.06, 6),
  },
  cardUnread: { backgroundColor: '#f3fbf7' },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontFamily: FONT[600], fontSize: 14, color: colors.text },
  message: { fontFamily: FONT[400], fontSize: 12.5, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  time: { fontFamily: FONT[400], fontSize: 11, color: colors.textMuted, marginTop: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginLeft: 8, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontFamily: FONT[500], marginTop: 10, color: colors.textMuted },
});
