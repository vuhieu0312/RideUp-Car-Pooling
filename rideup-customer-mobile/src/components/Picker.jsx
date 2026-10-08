import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, shadow } from '../theme';

/**
 * Custom dropdown picker (giống CustomerHomePage web).
 * Mở modal search + list options, click để chọn.
 */
export default function Picker({ value, options, isOpen, onOpen, onClose, onSelect, placeholder }) {
  const [keyword, setKeyword] = useState('');
  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) => o.name.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <>
      <TouchableOpacity onPress={onOpen} style={styles.trigger}>
        <Text style={selected ? styles.selectedText : styles.placeholder} numberOfLines={1}>
          {selected?.name || placeholder}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <View style={styles.menu} onStartShouldSetResponder={() => true}>
            <TextInput
              autoFocus
              value={keyword}
              onChangeText={setKeyword}
              placeholder="Nhập để tìm kiếm"
              style={styles.searchInput}
              placeholderTextColor="#a4b2ae"
            />
            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {filtered.length === 0 ? (
                <Text style={styles.empty}>Không tìm thấy kết quả</Text>
              ) : (
                filtered.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.option, opt.id === value && styles.optionSelected]}
                    onPress={() => { onSelect(opt.id); setKeyword(''); }}
                  >
                    <Text style={[styles.optionText, opt.id === value && styles.optionTextSelected]}>{opt.name}</Text>
                    {opt.id === value && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 22, paddingVertical: 2 },
  selectedText: { fontSize: 12, fontWeight: '600', color: colors.textDark, flex: 1 },
  placeholder: { fontSize: 12, color: colors.textLabel, flex: 1 },
  chevron: { color: '#9aaca6', fontSize: 18, marginLeft: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menu: { width: '100%', maxWidth: 460, maxHeight: 360, padding: 8, borderWidth: 1, borderColor: colors.borderDate, borderRadius: 10, backgroundColor: 'white', ...shadow(8, 0.16, 18) },
  searchInput: { marginBottom: 6, padding: 9, borderWidth: 1, borderColor: colors.borderDate, borderRadius: 8, fontSize: 11, color: colors.textDark, backgroundColor: 'white' },
  optionsList: { maxHeight: 280 },
  empty: { padding: 14, fontSize: 11, color: colors.textSubtle, textAlign: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 7, backgroundColor: 'white' },
  optionSelected: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: 12, color: colors.textDark },
  optionTextSelected: { color: colors.primaryDark, fontWeight: '600' },
  checkmark: { color: colors.primaryDark, fontSize: 14 },
});