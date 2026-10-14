import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, shadow } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Typography';

/** Date picker giống CustomerHomePage web */
function pad(n) {
  return String(n).padStart(2, '0');
}

/** Ngày theo giờ máy (không dùng toISOString vì bị lệch UTC). */
export function toIso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso() {
  return toIso(new Date());
}

export function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIso(d);
}

/** minDate (YYYY-MM-DD): ngày sớm nhất được chọn. Không truyền thì không giới hạn (vd: ngày sinh). */
export default function DateField({ value, onChange, minDate = '' }) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(`${value}T00:00:00`) : new Date();
  const [month, setMonth] = useState(current.getMonth());
  const [year, setYear] = useState(current.getFullYear());

  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Thứ 2 = 0
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  const monthPrefix = `${year}-${pad(month + 1)}`;
  const canGoPrev = monthPrefix > minDate.slice(0, 7); // không lùi về tháng đã qua

  function moveMonth(offset) {
    const next = new Date(year, month + offset, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  }

  function chooseDay(iso) {
    if (iso < minDate) return;
    onChange(iso);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={value ? styles.selectedText : styles.placeholder}>
          {value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : 'Chọn ngày khởi hành'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color="#9aaca6" style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.menu} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <TouchableOpacity style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]} disabled={!canGoPrev} onPress={() => moveMonth(-1)}>
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
                  const iso = `${monthPrefix}-${pad(day)}`;
                  const isPast = iso < minDate;
                  const isSelected = iso === value;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                      disabled={isPast}
                      onPress={() => chooseDay(iso)}
                    >
                      <Text style={[styles.dayText, isPast && styles.dayTextPast, isSelected && styles.dayTextSelected]}>{day}</Text>
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
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: colors.primaryAccent, fontSize: 17, lineHeight: 19 },

  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', color: '#8aa098', fontSize: 8, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
  dayText: { fontSize: 10, color: colors.textDark },
  dayCellSelected: { backgroundColor: colors.primary, borderRadius: 6 },
  dayTextPast: { color: '#c5cfcb' },
  dayTextSelected: { color: 'white', fontWeight: '700' },
});