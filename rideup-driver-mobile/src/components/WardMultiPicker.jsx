import { useEffect, useMemo, useState } from 'react';
import {
  FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme';

/**
 * Dropdown chọn nhiều xã/phường với search.
 * - Trigger chỉ hiện "(count/max)" + chevron.
 * - Mở modal: search input + list checkbox, có nút "Xong (count)" ở cuối.
 * - Khi đạt max thì khóa các item chưa chọn.
 */
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

  // Reset keyword khi đóng modal
  useEffect(() => {
    if (!open) setKeyword('');
  }, [open]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const matched = k ? wards.filter((w) => w.name.toLowerCase().includes(k)) : wards;
    // Đã chọn lên đầu, giữ nguyên thứ tự tương đối của từng nhóm
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

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{label}{required ? ' *' : ''}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={16} color={colors.textSubtle} style={styles.searchIcon} />
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                placeholder="Tìm phường/xã..."
                placeholderTextColor={colors.textSubtle}
                style={styles.searchInput}
                autoFocus
                underlineColorAndroid="transparent"
              />
              {keyword.length > 0 && (
                <TouchableOpacity onPress={() => setKeyword('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textSubtle} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
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
                    style={[styles.item, isSelected && styles.itemActive]}
                    activeOpacity={0.7}
                    disabled={blocked}
                    onPress={() => onToggle(item.id)}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && styles.itemTextActive,
                        blocked && styles.itemTextDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <MaterialCommunityIcons
                      name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
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
              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.8}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.doneText}>Xong ({count})</Text>
              </TouchableOpacity>
            </View>
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

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.textDark },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderDate,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
    boxShadow: 'none',
  },

  list: { maxHeight: 380 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  itemActive: { backgroundColor: colors.primaryFaintest },
  itemText: { flex: 1, fontSize: 13, color: colors.text },
  itemTextActive: { color: colors.primaryAccent },
  itemTextDisabled: { color: colors.textSubtle },
  empty: { padding: 24, textAlign: 'center', color: colors.textSubtle, fontSize: 13 },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  footerHint: { fontSize: 11, color: colors.textSubtle, marginBottom: 8, textAlign: 'center' },
  doneBtn: {
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 9,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
