import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../components/Typography';
import { listMyConversations } from '../api/api';
import { colors, FONT } from '../theme';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN') === new Date().toLocaleDateString('vi-VN') ?
  date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) :
  date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function ConversationsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadConversations = useCallback(() => {
    setLoading(true);
    setError('');
    listMyConversations().
    then(setConversations).
    catch(() => setError('Không tải được danh sách tin nhắn.')).
    finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadConversations);

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <MaterialCommunityIcons name="message-text-outline" size={21} color={colors.primaryAccent} />
        </View>
        <View style={styles.headingText}>
          <Text style={styles.kicker}>RIDEUP</Text>
          <Text style={styles.title}>Tin nhắn</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tải lại" onPress={loadConversations} style={styles.refresh}>
          <MaterialCommunityIcons name="refresh" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ?
      <View style={styles.center}>
          <ActivityIndicator color={colors.primaryAccent} />
          <Text style={styles.helper}>Đang tải hội thoại...</Text>
        </View> :
      error ?
      <View style={styles.center}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={34} color={colors.textMuted} />
          <Text style={styles.helper}>{error}</Text>
          <TouchableOpacity onPress={loadConversations} style={styles.retry}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View> :
      conversations.length === 0 ?
      <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="chat-processing-outline" size={30} color={colors.primaryAccent} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có hội thoại</Text>
          <Text style={styles.helper}>Tin nhắn với tài xế sẽ xuất hiện khi booking được xác nhận.</Text>
        </View> :

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversationId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {var _item$bookingId;return (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.row}
              onPress={() => navigation.navigate('Chat', {
                conversationId: item.conversationId,
                bookingId: item.bookingId,
                name: item.driverName
              })}>
              
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.driverName || 'T').trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.details}>
                <View style={styles.nameLine}>
                  <Text style={styles.name} numberOfLines={1}>{item.driverName || 'Tài xế'}</Text>
                  <Text style={styles.time}>{formatTime(item.lastMessageAt || item.tripDeparture)}</Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessagePreview || 'Bắt đầu trò chuyện về chuyến đi'}
                </Text>
                <Text style={styles.booking}>Booking #{(_item$bookingId = item.bookingId) == null ? void 0 : _item$bookingId.slice(-8).toUpperCase()}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>);}
        } />

      }
    </View>);

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginRight: 12
  },
  headingText: { flex: 1 },
  kicker: { fontFamily: FONT[700], fontSize: 9, color: colors.primaryAccent, letterSpacing: 0.8 },
  title: { fontFamily: FONT[700], fontSize: 23, color: colors.text, marginTop: 2 },
  refresh: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  row: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5f3ed',
    marginRight: 13
  },
  avatarText: { fontFamily: FONT[700], fontSize: 18, color: colors.primaryDark },
  details: { flex: 1, minWidth: 0, paddingVertical: 11 },
  nameLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: FONT[700], fontSize: 15, color: colors.text },
  time: { fontFamily: FONT[400], fontSize: 11, color: colors.textMuted },
  preview: { fontFamily: FONT[400], fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  booking: { fontFamily: FONT[500], fontSize: 10, color: colors.textMuted, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  helper: { fontFamily: FONT[400], fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center', marginTop: 10 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyTitle: { fontFamily: FONT[700], fontSize: 17, color: colors.text, marginTop: 16 },
  retry: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.primaryAccent, borderRadius: 6 },
  retryText: { fontFamily: FONT[600], fontSize: 13, color: colors.textOnPrimary }
});