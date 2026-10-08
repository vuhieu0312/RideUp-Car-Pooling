import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

/**
 * Time picker — 2 cột cuộn: Giờ (00-23) và Phút (00-59).
 * - value: 'HH:MM' hoặc ''
 * - onChange: (newValue: 'HH:MM') => void
 */
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // bước 5 phút

export default function TimeField({ value, onChange, placeholder = 'Chọn giờ' }) {
  const [open, setOpen] = useState(false);
  const [h, m] = value ? value.split(':') : ['', ''];
  const [tempH, setTempH] = useState(h || '08');
  const [tempM, setTempM] = useState(m || '00');

  function openModal() {
    // Reset temp về giá trị hiện tại (hoặc mặc định) mỗi lần mở
    setTempH(h || '08');
    setTempM(m || '00');
    setOpen(true);
  }

  function confirm() {
    onChange(`${tempH}:${tempM}`);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openModal} activeOpacity={0.7}>
        <Text style={value ? styles.selectedText : styles.placeholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primaryAccent} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.title}>Chọn giờ khởi hành</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.preview}>
              <Text style={styles.previewTime}>{tempH}:{tempM}</Text>
            </View>

            <View style={styles.cols}>
              <ScrollColumn items={HOURS} selected={tempH} onPick={setTempH} label="Giờ" />
              <ScrollColumn items={MINUTES} selected={tempM} onPick={setTempM} label="Phút" />
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={confirm} activeOpacity={0.8}>
              <Text style={styles.doneText}>Xong</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ScrollColumn({ items, selected, onPick, label }) {
  return (
    <View style={styles.col}>
      <Text style={styles.colLabel}>{label}</Text>
      <ScrollView style={styles.colList} contentContainerStyle={styles.colContent} keyboardShouldPersistTaps="handled">
        {items.map((it) => {
          const active = it === selected;
          return (
            <TouchableOpacity
              key={it}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => onPick(it)}
              activeOpacity={0.7}
            >
              <Text style={[styles.itemText, active && styles.itemTextActive]}>{it}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 9, backgroundColor: colors.surfaceMuted },
  selectedText: { fontSize: 13, fontWeight: '600', color: colors.text },
  placeholder: { fontSize: 13, color: colors.textSubtle },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 460, padding: 12, borderWidth: 1, borderColor: colors.borderDate, borderRadius: 12, backgroundColor: 'white', ...shadow(8, 0.16, 18) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: colors.textDark, fontSize: 13, fontWeight: '700' },

  preview: { alignItems: 'center', paddingVertical: 6, marginBottom: 4 },
  previewTime: { fontSize: 28, fontWeight: '800', color: colors.primaryAccent, letterSpacing: 2 },

  cols: { flexDirection: 'row', gap: 8, height: 220 },
  col: { flex: 1 },
  colLabel: { textAlign: 'center', fontSize: 10, color: colors.textSubtle, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  colList: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.surfaceMuted },
  colContent: { paddingVertical: 4 },
  item: { paddingVertical: 9, alignItems: 'center', borderRadius: 6, marginHorizontal: 4, marginVertical: 1 },
  itemActive: { backgroundColor: colors.primary },
  itemText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  itemTextActive: { color: 'white', fontWeight: '700' },

  doneBtn: { marginTop: 12, paddingVertical: 11, backgroundColor: colors.primary, borderRadius: 9, alignItems: 'center' },
  doneText: { color: 'white', fontWeight: '700', fontSize: 13 },
});
