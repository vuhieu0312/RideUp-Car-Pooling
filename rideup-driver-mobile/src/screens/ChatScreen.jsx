import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Typography';
import { useAuth } from '../auth/AuthContext';
import { subscribeEvents } from '../realtime/realtime';
import { getConversationMessages } from '../api/api';
import {
    sendChatMessage,
    subscribeChat,
    subscribeConversation,
    unsubscribeConversation,
} from '../realtime/realtime';
import { colors, FONT } from '../theme';

function mergeMessages(current, incoming) {
    const unique = new Map();
    [...current, ...incoming].forEach((message, index) => {
        const key = message.id || `${message.createdAt || ''}-${message.senderId || ''}-${index}`;
        unique.set(key, message);
    });
    return [...unique.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function formatMessageTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ route, navigation }) {
    const { conversationId, bookingId, name } = route.params;
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const listRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
  const [closed, setClosed] = useState(false);

    useEffect(() => {
        let active = true;
        subscribeConversation(conversationId);
        const unsubscribeEvents = subscribeEvents((event) => {
          if (event.type === 'CHAT_ERROR') {
            setError(event.message || 'Không gửi được tin nhắn.');
          } else if (event.type === 'BOOKING_UPDATED' && event.bookingId === bookingId && event.status !== 'CONFIRMED') {
            setClosed(true);
          }
        });
        const unsubscribe = subscribeChat((message) => {
            if (message.conversationId === conversationId) {
                setMessages((current) => mergeMessages(current, [message]));
            }
        });

        getConversationMessages(conversationId)
            .then((history) => {
                if (active) setMessages((current) => mergeMessages(current, history));
            })
            .catch(() => {
                if (active) setError('Không tải được lịch sử tin nhắn.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
            unsubscribe();
            unsubscribeEvents();
            unsubscribeConversation(conversationId);
        };
    }, [conversationId]);

    useEffect(() => {
        if (messages.length) listRef.current?.scrollToEnd({ animated: true });
    }, [messages.length]);

    function send() {
        const content = text.trim();
        if (closed) return;
        if (!content || !user?.id) return;
        const sent = sendChatMessage({ conversationId, type: 'TEXT', content });
        if (!sent) {
            setError('Đang mất kết nối. Tin nhắn chưa được gửi.');
            return;
        }
        setError('');
        setText('');
    }

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(name || 'H').trim().charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{name || 'Hành khách'}</Text>
                    <Text style={styles.headerCaption}>Trao đổi về chuyến đi</Text>
                </View>
            </View>

            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item, index) => item.id || `${item.createdAt || 'message'}-${index}`}
                contentContainerStyle={styles.messageList}
                ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
                ListEmptyComponent={loading ? (
                    <View style={styles.loading}>
                        <ActivityIndicator color={colors.primaryAccent} />
                    </View>
                ) : (
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="message-outline" size={27} color={colors.textMuted} />
                        <Text style={styles.emptyText}>Bắt đầu cuộc trò chuyện với hành khách</Text>
                    </View>
                )}
                renderItem={({ item }) => {
                    const own = item.senderId === user?.id;
                    return (
                        <View style={[styles.messageRow, own ? styles.ownRow : styles.otherRow]}>
                            <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}>
                                <Text style={[styles.messageText, own && styles.ownText]}>{item.content}</Text>
                                <Text style={[styles.time, own && styles.ownTime]}>{formatMessageTime(item.createdAt)}</Text>
                            </View>
                        </View>
                    );
                }}
            />

            {closed ? (
              <View style={[styles.closedWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <MaterialCommunityIcons name="message-off-outline" size={16} color={colors.textMuted} />
                <Text style={styles.closedText}>Chuyến đã bị huỷ hoặc kết thúc, không thể nhắn tin nữa.</Text>
              </View>
            ) : (
            <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <View style={styles.composer}>
                    <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder="Nhập tin nhắn..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        editable={!closed}
                        maxLength={2000}
                        style={styles.input}
                        onSubmitEditing={send}
                    />
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Gửi tin nhắn"
                        onPress={send}
                        disabled={closed || !text.trim()}
                        style={[styles.sendButton, !text.trim() && styles.sendDisabled]}>
                        <MaterialCommunityIcons name="send" size={18} color={colors.textOnPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
        minHeight: 74,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 10,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5f3ed', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: FONT[700], fontSize: 16, color: colors.primaryDark },
    headerInfo: { flex: 1, minWidth: 0, marginLeft: 11 },
    headerName: { fontFamily: FONT[700], fontSize: 15, color: colors.text },
    headerCaption: { fontFamily: FONT[400], fontSize: 11, color: colors.textMuted, marginTop: 2 },
    messageList: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 14, paddingVertical: 16 },
    messageRow: { width: '100%', marginVertical: 4 },
    ownRow: { alignItems: 'flex-end' },
    otherRow: { alignItems: 'flex-start' },
    bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingTop: 9, paddingBottom: 6, borderRadius: 15 },
    ownBubble: { backgroundColor: colors.primaryAccent, borderBottomRightRadius: 4 },
    otherBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
    messageText: { fontFamily: FONT[400], fontSize: 14, lineHeight: 20, color: colors.text },
    ownText: { color: colors.textOnPrimary },
    time: { alignSelf: 'flex-end', fontFamily: FONT[400], fontSize: 9, color: colors.textMuted, marginTop: 3 },
    ownTime: { color: 'rgba(255,255,255,0.78)' },
    loading: { paddingVertical: 24 },
    empty: { alignItems: 'center', paddingVertical: 28 },
    emptyText: { fontFamily: FONT[400], fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 9 },
    error: { alignSelf: 'center', fontFamily: FONT[500], fontSize: 12, color: colors.dangerText, marginBottom: 12, textAlign: 'center' },
    closedWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
    closedText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
    composerWrap: { paddingHorizontal: 12, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
    input: {
        flex: 1,
        minHeight: 42,
        maxHeight: 112,
        paddingHorizontal: 14,
        paddingTop: 11,
        paddingBottom: 10,
        borderRadius: 20,
        backgroundColor: colors.bg,
        color: colors.text,
        fontFamily: FONT[400],
        fontSize: 14,
    },
    sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryAccent },
    sendDisabled: { opacity: 0.45 },
});