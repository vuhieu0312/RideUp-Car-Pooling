import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, FONT } from '../theme';
import { Text, TextInput } from './Typography';

const MAX_RECENT = 5;

export const normalizeText = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates?.height || 0));
    const h = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => { s.remove(); h.remove(); };
  }, []);
  return height;
}

export default function FullScreenPicker({ visible, onClose, onSelect, options, value, title, recentKey, sectionTitle }) {
  const [keyword, setKeyword] = useState('');
  const [recentIds, setRecentIds] = useState([]);
  const insets = useSafeAreaInsets();
  const keyboardH = useKeyboardHeight();
  const storageKey = recentKey ? `pickerRecent:${recentKey}` : null;

  useEffect(() => {
    if (!visible) { setKeyword(''); return; }
    if (!storageKey) return;
    AsyncStorage.getItem(storageKey)
      .then((raw) => setRecentIds(raw ? JSON.parse(raw) : []))
      .catch(() => setRecentIds([]));
  }, [visible, storageKey]);

  const filtered = useMemo(() => {
    const k = normalizeText(keyword);
    return k ? options.filter((o) => normalizeText(o.name).includes(k)) : options;
  }, [options, keyword]);
  const recents = useMemo(
    () => recentIds.map((id) => options.find((o) => o.id === id)).filter(Boolean),
    [recentIds, options]
  );

  function pick(id) {
    if (storageKey && id) {
      const next = [id, ...recentIds.filter((x) => x !== id)].slice(0, MAX_RECENT);
      setRecentIds(next);
      AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
    }
    onSelect(id);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: keyboardH || insets.bottom }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Đóng">
            <MaterialCommunityIcons name="close" size={26} color={colors.textDark} />
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.primaryAccent} />
            <TextInput
              autoFocus
              value={keyword}
              onChangeText={setKeyword}
              placeholder={title || 'Nhập để tìm kiếm'}
              style={styles.searchInput}
              placeholderTextColor="#a4b2ae"
              autoCorrect={false}
              returnKeyType="search"
              underlineColorAndroid="transparent"
            />
            {!!keyword && (
              <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#9aaca6" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          {!keyword && recents.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Tìm kiếm gần đây</Text>
              <View style={styles.chips}>
                {recents.map((o) => (
                  <TouchableOpacity key={o.id} style={styles.chip} onPress={() => pick(o.id)}>
                    <MaterialCommunityIcons name="history" size={18} color={colors.textDark} />
                    <Text style={styles.chipText}>{o.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {!!sectionTitle && !keyword && <Text style={styles.sectionTitle}>{sectionTitle}</Text>}

          {filtered.length === 0 ? (
            <Text style={styles.empty}>Không tìm thấy kết quả</Text>
          ) : (
            filtered.map((opt) => (
              <TouchableOpacity key={opt.id} style={styles.option} onPress={() => pick(opt.id)}>
                <View style={[styles.optionIcon, opt.id === value && styles.optionIconSelected]}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primaryAccent} />
                </View>
                <Text style={[styles.optionText, opt.id === value && styles.optionTextSelected]}>{opt.name}</Text>
                {opt.id === value && <MaterialCommunityIcons name="check" size={20} color={colors.primaryDark} />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white', paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.primaryAccent, borderRadius: 24, backgroundColor: 'white' },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.text, boxShadow: 'none' },

  content: { paddingTop: 20, paddingBottom: 24 },
  sectionTitle: { marginTop: 4, marginBottom: 12, fontSize: 16, fontFamily: FONT[700], color: colors.textDark },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 22, backgroundColor: 'white' },
  chipText: { fontSize: 14, fontFamily: FONT[600], color: colors.textDark },

  empty: { padding: 24, fontSize: 13, color: colors.textSubtle, textAlign: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  optionIconSelected: { backgroundColor: colors.primaryLighter },
  optionText: { flex: 1, fontSize: 15, color: colors.text },
  optionTextSelected: { fontFamily: FONT[700], color: colors.primaryDark },
});
