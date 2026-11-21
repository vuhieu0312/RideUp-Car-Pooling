import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import { FONT, colors } from '../theme';

const MONTH_LABELS = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
const CHART_HEIGHT = 130;
const BAR_SLOT = 38;

const dayLabel = (date) => (date ? `${date.substring(8, 10)}/${date.substring(5, 7)}` : '');

function buildVisible(data, period) {
  if (period === 'day') {
    return data.slice(-1).map((item) => ({ ...item, key: item.date, label: 'Hôm nay' }));
  }
  if (period === 'week') {
    return data.slice(-7).map((item) => ({ ...item, key: item.date, label: dayLabel(item.date) }));
  }
  if (period === 'year') {
    const months = new Map();
    const today = new Date();
    for (let offset = 11; offset >= 0; offset -= 1) {
      const month = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      months.set(key, { date: key, key, label: MONTH_LABELS[month.getMonth()], value: 0 });
    }
    data.forEach((item) => {
      const month = months.get(item.date?.substring(0, 7));
      if (month) month.value += Number(item.value || 0);
    });
    return Array.from(months.values());
  }
  return data.slice(-30).map((item) => ({ ...item, key: item.date, label: dayLabel(item.date) }));
}

const defaultFormat = (value) => Number(value || 0).toLocaleString('vi-VN');

export default function BarChart({ data, period, color = colors.primaryAccent, formatValue = defaultFormat }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [measured, setMeasured] = useState(0);
  const visible = buildVisible(data, period);

  if (!visible.length) return <Text style={styles.empty}>Chưa có dữ liệu biểu đồ</Text>;

  const max = Math.max(1, ...visible.map((item) => Number(item.value || 0)));
  const total = visible.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const chartWidth = measured;
  const contentWidth = Math.max(chartWidth, visible.length * BAR_SLOT);
  if (!chartWidth) return <View onLayout={(e) => setMeasured(Math.floor(e.nativeEvent.layout.width))} style={{ height: CHART_HEIGHT }} />;
  const slot = contentWidth / visible.length;
  const selected = visible.find((item) => item.key === selectedKey);
  const selectedLabel = selected?.date?.length === 7
    ? `${selected.date.substring(5, 7)}/${selected.date.substring(0, 4)}`
    : selected?.date
      ? `${selected.date.substring(8, 10)}/${selected.date.substring(5, 7)}/${selected.date.substring(0, 4)}`
      : '';

  return (
    <View onLayout={(e) => setMeasured(Math.floor(e.nativeEvent.layout.width))}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>{selected ? selectedLabel : 'Tổng kỳ này'}</Text>
        <Text style={styles.summaryValue}>{formatValue(selected ? selected.value : total)}</Text>
      </View>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={contentWidth > chartWidth}>
        <View style={{ width: contentWidth }}>
          <View style={[styles.chart, { width: contentWidth }]}>
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <View key={ratio} pointerEvents="none" style={[styles.gridLine, { bottom: ratio * CHART_HEIGHT }]} />
            ))}
            {visible.map((item, index) => {
              const active = selectedKey === item.key;
              const dimmed = selectedKey && !active;
              return (
                <Pressable
                  key={item.key || index}
                  accessibilityRole="button"
                  onHoverIn={() => setSelectedKey(item.key)}
                  onPress={() => setSelectedKey(active ? null : item.key)}
                  style={[styles.barColumn, { width: slot }]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (Number(item.value || 0) / max) * (CHART_HEIGHT - 10)),
                        backgroundColor: color,
                        opacity: dimmed ? 0.35 : 1,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {visible.map((item, index) => (
              <Text key={item.key || index} style={[styles.barLabel, { width: slot }]} numberOfLines={1}>{item.label}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: '#94a3b8', paddingVertical: 16, fontFamily: FONT[500] },
  summary: { marginBottom: 12 },
  summaryLabel: { fontFamily: FONT[500], fontSize: 12, color: colors.textMuted },
  summaryValue: { fontFamily: FONT[800], fontSize: 22, color: colors.text },
  chart: { height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#f1f5f9' },
  barColumn: { alignItems: 'center', justifyContent: 'flex-end', height: CHART_HEIGHT },
  bar: { width: 16, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { fontFamily: FONT[500], fontSize: 10, color: '#64748b', marginTop: 6, textAlign: 'center' },
});
