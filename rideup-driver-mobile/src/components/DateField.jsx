import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

/**
 * Date picker dạng lịch tháng — grid 6×7 với prev/next tháng.
 * - value: 'YYYY-MM-DD' hoặc ''
 * - onChange: (newValue: 'YYYY-MM-DD') => void
 */
export default function DateField({ value, onChange, placeholder = 'Chọn ngày' }) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(`${value}T00:00:00`) : new Date();
  const [month, setMonth] = useState(current.getMonth());
  const [year, setYear] = useState(current.getFullYear());

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Thứ 2 = 0
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  const selectedDay = value ? Number(value.slice(8, 10)) : null;

  function moveMonth(offset) {
    const next = new Date(year, month + offset, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  }

  function dayKey(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isPast(day) {
    return dayKey(day) < todayKey;
  }

  function chooseDay(day) {
    if (isPast(day)) return;
    onChange(dayKey(day));
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={value ? styles.selectedText : styles.placeholder} numberOfLines={1}>
          {value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : placeholder}
        </Text>
        <MaterialCommunityIcons name="calendar" size={16} color={colors.primaryAccent} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.menu} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.navBtn} onPress={() => moveMonth(-1)} hitSlop={6}>
                <Text style={styles.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <TouchableOpacity style={styles.navBtn} onPress={() => moveMonth(1)} hitSlop={6}>
                <Text style={styles.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weekdays}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <Text key={d} style={styles.weekday}>{d}</Text>
              ))}
            </View>
            <ScrollView style={{ maxHeight: 240 }}>
              <View style={styles.grid}>
                {Array.from({ length: firstDay }, (_, i) => (
                  <View key={`e-${i}`} style={styles.dayCell} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const day = i + 1;
                  const selected = day === selectedDay;
                  const past = isPast(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCell, selected && styles.dayCellSelected]}
                      onPress={() => chooseDay(day)}
                      activeOpacity={0.7}
                      disabled={past}
                    >
                      <Text style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        past && styles.dayTextDisabled,
                      ]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 9, backgroundColor: colors.surfaceMuted },
  selectedText: { fontSize: 13, fontWeight: '600', color: colors.text },
  placeholder: { fontSize: 13, color: colors.textSubtle },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menu: { width: '100%', maxWidth: 460, padding: 12, borderWidth: 1, borderColor: colors.borderDate, borderRadius: 10, backgroundColor: 'white', ...shadow(8, 0.16, 18) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthLabel: { color: colors.textDark, fontSize: 13, textTransform: 'capitalize', fontWeight: '700' },
  navBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { color: colors.primaryAccent, fontSize: 18, lineHeight: 20, fontWeight: '700' },

  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', color: colors.textSubtle, fontSize: 10, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  dayText: { fontSize: 12, color: colors.text },
  dayTextDisabled: { color: colors.textSubtle, opacity: 0.4 },
  dayCellSelected: { backgroundColor: colors.primary, borderRadius: 7 },
  dayTextSelected: { color: 'white', fontWeight: '700' },
});
