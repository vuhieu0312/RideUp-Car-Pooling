import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, FONT, typography } from '../theme';
import { normalizeText, useKeyboardHeight } from './FullScreenPicker';
import { Text, TextInput } from './Typography';

export default function WardMultiPicker({
  label,
  wards,
  selectedIds,
  onToggle,
  max = 4,
  placeholder = 'Vui lòng chọn tỉnh trước',
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const insets = useSafeAreaInsets();
  const keyboardH = useKeyboardHeight();

  useEffect(() => {
    if (!open) setKeyword('');
  }, [open]);

  const filtered = useMemo(() => {
    const k = normalizeText(keyword);
    const matched = k ? wards.filter((w) => normalizeText(w.name).includes(k)) : wards;
    // ward đã chọn lên đầu
    return [
      ...matched.filter((w) => selectedIds.includes(w.id)),
      ...matched.filter((w) => !selectedIds.includes(w.id)),
    ];
  }, [wards, keyword, selectedIds]);

  const count = selectedIds.length;
  const disabled = wards.length === 0;
  const atMax = count >= max;

  const displayText = disabled
    ? placeholder
    : count === 0
      ? 'Chọn khu vực'
      : count === 1
        ? wards.find((w) => w.id === selectedIds[0])?.name
        : `Đã chọn ${count} khu vực`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}{required ? ' *' : ''} <Text style={styles.count}>({count}/{max})</Text>
      </Text>

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[styles.triggerText, count === 0 && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primaryAccent} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: keyboardH || insets.bottom }]}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Đóng">
              <MaterialCommunityIcons name="close" size={26} color={colors.textDark} />
            </TouchableOpacity>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.primaryAccent} />
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                placeholder={`${label}: tìm phường/xã`}
                placeholderTextColor="#a4b2ae"
                style={styles.searchInput}
                autoFocus
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
              {keyword.length > 0 && (
                <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#9aaca6" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <Text style={styles.empty}>
                {keyword ? `Không tìm thấy "${keyword}"` : 'Không có dữ liệu'}
              </Text>
            }
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id);
              const blocked = !isSelected && atMax;
              return (
                <TouchableOpacity
                  style={[styles.item, blocked && styles.itemBlocked]}
                  activeOpacity={0.7}
                  disabled={blocked}
                  onPress={() => onToggle(item.id)}
                >
                  <View style={[styles.itemIcon, isSelected && styles.itemIconSelected]}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primaryAccent} />
                  </View>
                  <Text style={[styles.itemText, isSelected && styles.itemTextActive]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <MaterialCommunityIcons
                    name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={isSelected ? colors.primaryAccent : colors.textSubtle}
                  />
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.footer}>
            <Text style={styles.footerHint}>
              {atMax ? `Đã đạt tối đa ${max} khu vực` : `Có thể chọn tối đa ${max} khu vực`}
            </Text>
            <TouchableOpacity style={styles.doneBtn} activeOpacity={0.8} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>Xong ({count})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6 },
  label: { ...typography.label, marginTop: 9, marginBottom: 5, color: colors.textSecondary, fontSize: 11 },
  count: { color: colors.textSubtle, fontSize: 10, fontWeight: '500' },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
  },
  triggerDisabled: { opacity: 0.55 },
  triggerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  triggerPlaceholder: { color: colors.textSubtle, fontWeight: '400' },

  screen: { flex: 1, backgroundColor: 'white', paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.primaryAccent, borderRadius: 24, backgroundColor: 'white' },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.text, boxShadow: 'none' },

  list: { flex: 1, marginTop: 12 },
  listContent: { paddingBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemBlocked: { opacity: 0.45 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  itemIconSelected: { backgroundColor: colors.primaryLighter },
  itemText: { flex: 1, marginRight: 10, fontSize: 15, color: colors.text },
  itemTextActive: { fontFamily: FONT[700], color: colors.primaryDark },
  empty: { padding: 24, textAlign: 'center', color: colors.textSubtle, fontSize: 13 },

  footer: { paddingTop: 10, borderTopWidth: 1, borderColor: colors.border },
  footerHint: { fontSize: 11, color: colors.textSubtle, marginBottom: 8, textAlign: 'center' },
  doneBtn: { marginBottom: 8, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center' },
  doneText: { color: '#fff', fontFamily: FONT[700], fontSize: 14 },
});
