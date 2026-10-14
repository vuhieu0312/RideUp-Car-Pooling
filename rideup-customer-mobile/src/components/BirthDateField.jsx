import { useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';
import { Text } from './Typography';

const pad = (n) => String(n).padStart(2, '0');
const MONTHS = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 101 }, (_, i) => THIS_YEAR - i); // năm nay → 100 năm trước
const YEAR_ROW_HEIGHT = 44;
const YEAR_COLS = 4;

/** Chọn ngày sinh: bấm "Tháng" hoặc "Năm" trên tiêu đề để chọn nhanh, không giới hạn quá khứ, không cho chọn ngày trong tương lai. */
export default function BirthDateField({ value, onChange, placeholder = 'Chọn ngày sinh' }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('day'); // 'day' | 'month' | 'year'
  const [year, setYear] = useState(THIS_YEAR - 20);
  const [month, setMonth] = useState(0);

  const today = new Date();
  const maxIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  function openPicker() {
    const base = value ? new Date(`${value}T00:00:00`) : null;
    setYear(base ? base.getFullYear() : THIS_YEAR - 20);
    setMonth(base ? base.getMonth() : 0);
    setMode('day');
    setOpen(true);
  }

  function moveMonth(offset) {
    const next = new Date(year, month + offset, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  function chooseDay(day) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
    if (iso > maxIso) return;
    onChange(iso);
    setOpen(false);
  }

  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Thứ 2 = 0
  const label = value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '';
  const yearIndex = Math.max(0, YEARS.indexOf(year));

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openPicker}>
        <Text style={label ? styles.value : styles.placeholder}>{label || placeholder}</Text>
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#9aaca6" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.menu} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.navBtn}
                disabled={mode !== 'day'}
                onPress={() => moveMonth(-1)}
              >
                {mode === 'day' && <MaterialCommunityIcons name="chevron-left" size={20} color={colors.primaryAccent} />}
              </TouchableOpacity>

              <View style={styles.titleRow}>
                <TouchableOpacity style={styles.titleBtn} onPress={() => setMode(mode === 'month' ? 'day' : 'month')}>
                  <Text style={styles.title}>Tháng {month + 1}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.titleBtn} onPress={() => setMode(mode === 'year' ? 'day' : 'year')}>
                  <Text style={styles.title}>{year}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textDark} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.navBtn}
                disabled={mode !== 'day'}
                onPress={() => moveMonth(1)}
              >
                {mode === 'day' && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primaryAccent} />}
              </TouchableOpacity>
            </View>

            {mode === 'year' && (
              <FlatList
                style={styles.body}
                data={YEARS}
                numColumns={YEAR_COLS}
                keyExtractor={(y) => String(y)}
                initialScrollIndex={Math.floor(yearIndex / YEAR_COLS)}
                getItemLayout={(_, index) => ({
                  length: YEAR_ROW_HEIGHT,
                  offset: YEAR_ROW_HEIGHT * Math.floor(index / YEAR_COLS),
                  index,
                })}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.cell4, item === year && styles.cellSelected]}
                    onPress={() => { setYear(item); setMode('day'); }}
                  >
                    <Text style={[styles.cellText, item === year && styles.cellTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {mode === 'month' && (
              <View style={[styles.body, styles.grid]}>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.cell3, i === month && styles.cellSelected]}
                    onPress={() => { setMonth(i); setMode('day'); }}
                  >
                    <Text style={[styles.cellText, i === month && styles.cellTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {mode === 'day' && (
              <View style={styles.body}>
                <View style={styles.weekdays}>
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                    <Text key={d} style={styles.weekday}>{d}</Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {Array.from({ length: firstDay }, (_, i) => <View key={`e-${i}`} style={styles.dayCell} />)}
                  {Array.from({ length: days }, (_, i) => {
                    const day = i + 1;
                    const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
                    const future = iso > maxIso;
                    const selected = iso === value;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayCell, selected && styles.cellSelected]}
                        disabled={future}
                        onPress={() => chooseDay(day)}
                      >
                        <Text style={[styles.dayText, future && styles.dayTextOff, selected && styles.cellTextSelected]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.borderLight,
    borderRadius: 8, backgroundColor: 'white',
  },
  value: { fontSize: 14, color: colors.textDark },
  placeholder: { fontSize: 14, color: '#71837d' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menu: { width: '100%', maxWidth: 360, padding: 14, borderRadius: 12, backgroundColor: 'white', ...shadow(8, 0.16, 18) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.primaryLight },
  title: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  navBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  body: { height: 252 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', color: '#8aa098', fontSize: 11, fontWeight: '700' },
  dayCell: { width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dayText: { fontSize: 13, color: colors.textDark },
  dayTextOff: { color: '#c5cfcb' },

  cell3: { width: '33.33%', height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cell4: { width: `${100 / YEAR_COLS}%`, height: YEAR_ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellText: { fontSize: 14, color: colors.textDark },
  cellSelected: { backgroundColor: colors.primary },
  cellTextSelected: { color: 'white', fontWeight: '700' },
});
