import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, shadow } from '../theme';

/**
 * Date picker giống CustomerHomePage web:
 * - Hiển thị "DD/MM/YYYY" hoặc placeholder
 * - Click mở modal lịch tháng với prev/next + grid 6×7
 */
export default function DateField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(`${value}T00:00:00`) : new Date();
  const [month, setMonth] = useState(current.getMonth());
  const [year, setYear] = useState(current.getFullYear());

  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Thứ 2 = 0
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  const selectedDay = value ? Number(value.slice(8, 10)) : null;

  function moveMonth(offset) {
    const next = new Date(year, month + offset, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  }

  function chooseDay(day) {
    onChange(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={value ? styles.selectedText : styles.placeholder}>
          {value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : 'Chọn ngày khởi hành'}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.menu} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.navBtn} onPress={() => moveMonth(-1)}>
                <Text style={styles.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <TouchableOpacity style={styles.navBtn} onPress={() => moveMonth(1)}>
                <Text style={styles.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weekdays}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <Text key={d} style={styles.weekday}>{d}</Text>
              ))}
            </View>
            <ScrollView style={{ maxHeight: 200 }}>
              <View style={styles.grid}>
                {Array.from({ length: firstDay }, (_, i) => (
                  <View key={`e-${i}`} style={styles.dayCell} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const day = i + 1;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCell, day === selectedDay && styles.dayCellSelected]}
                      onPress={() => chooseDay(day)}
                    >
                      <Text style={[styles.dayText, day === selectedDay && styles.dayTextSelected]}>{day}</Text>
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
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 22, paddingVertical: 2 },
  selectedText: { fontSize: 12, fontWeight: '600', color: colors.textDark },
  placeholder: { fontSize: 11, color: '#71837d', fontWeight: '500' },
  chevron: { color: '#9aaca6', fontSize: 14, marginLeft: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menu: { width: '100%', maxWidth: 460, padding: 12, borderWidth: 1, borderColor: colors.borderDate, borderRadius: 10, backgroundColor: 'white', ...shadow(8, 0.16, 18) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthLabel: { color: colors.textDark, fontSize: 11, textTransform: 'capitalize', fontWeight: '600' },
  navBtn: { width: 25, height: 25, borderRadius: 12.5, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { color: colors.primaryAccent, fontSize: 17, lineHeight: 19 },

  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', color: '#8aa098', fontSize: 8, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
  dayText: { fontSize: 10, color: colors.textDark },
  dayCellSelected: { backgroundColor: colors.primary, borderRadius: 6 },
  dayTextSelected: { color: 'white', fontWeight: '700' },
});