import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, IconButton, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getEarningsStats } from '../api/api';
import { colors } from '../theme';
import { Text } from '../components/Typography';

const vnd = (n) => `${Math.round(Number(n || 0)).toLocaleString('en-US')} ₫`;
const short = (n) => {
  const v = Number(n || 0);
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}tr`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}k`;
  return `${v}`;
};

function BarChart({ data }) {
  const max = Math.max(1, ...data.map((b) => Number(b.net)));
  const ref = useRef(null);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={ref} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}>
      <View style={styles.chart}>
        {data.map((b, i) => {
          const h = Math.max(2, (Number(b.net) / max) * 110);
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barVal} numberOfLines={1}>{Number(b.net) > 0 ? short(b.net) : ''}</Text>
              <View style={[styles.bar, { height: h, opacity: Number(b.net) > 0 ? 1 : 0.25 }]} />
              <Text style={styles.barLabel} numberOfLines={1}>{String(b.label).replace(/\/20(\d\d)$/, '/$1')}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function EarningsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState('daily');
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await getEarningsStats());
    } catch (e) {
      setSnack(e.response?.data?.message || 'Không tải được thống kê');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const list = data ? (mode === 'daily' ? data.daily : data.monthly) : [];
  const rows = [...list].reverse().filter((b) => b.bookings > 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Thống kê thu nhập</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {loading && !data ? (
          <Text style={{ textAlign: 'center', padding: 24 }}>Đang tải...</Text>
        ) : !data ? null : (
          <>
            <LinearGradient colors={['#0a9c5a', '#0b6e4f', '#0f3d33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroCircleBig} />
              <View style={styles.heroCircleSmall} />
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <MaterialCommunityIcons name="cash-multiple" size={20} color="#fff" />
                </View>
                <Text style={styles.heroLabel}>Tổng thu nhập ròng</Text>
              </View>
              <View style={styles.heroValueRow}>
                <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
                  {Math.round(Number(data.totalNet || 0)).toLocaleString('en-US')}
                </Text>
                <Text style={styles.heroUnit}>₫</Text>
              </View>
              <View style={styles.heroPill}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#bbf7d0" />
                <Text style={styles.heroPillText}>{data.trips} chuyến hoàn thành</Text>
              </View>
            </LinearGradient>

            <View style={styles.grid}>
              <View style={styles.miniCard}>
                <Text style={styles.sub}>Hôm nay</Text>
                <Text style={styles.num} numberOfLines={1} adjustsFontSizeToFit>{vnd(data.todayNet)}</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.sub}>Tháng này</Text>
                <Text style={styles.num} numberOfLines={1} adjustsFontSizeToFit>{vnd(data.monthNet)}</Text>
              </View>
            </View>

            <Card style={styles.card}><Card.Content>
              <Text style={styles.h}>Cơ cấu thu nhập</Text>
              <View style={styles.row}><Text style={styles.rowLabel}>Doanh thu (cước)</Text><Text style={styles.rowValue}>{vnd(data.totalGross)}</Text></View>
              <View style={styles.row}><Text style={styles.rowLabel}>Phí nền tảng ({data.feePercent}%)</Text><Text style={[styles.rowValue, { color: '#dc2626' }]}>-{vnd(data.totalFee)}</Text></View>
              <View style={[styles.row, styles.rowTotal]}><Text style={[styles.rowLabel, styles.bold]}>Thu nhập ròng</Text><Text style={[styles.rowValue, { color: '#059669' }]}>{vnd(data.totalNet)}</Text></View>
              <View style={styles.row}><Text style={styles.rowLabel}>Nhận qua Stripe (vào ví)</Text><Text style={styles.rowValue}>{vnd(data.stripeNet)}</Text></View>
              <View style={styles.row}><Text style={styles.rowLabel}>Thu tiền mặt trực tiếp</Text><Text style={styles.rowValue}>{vnd(data.cashNet)}</Text></View>
            </Card.Content></Card>

            <View style={styles.tabs}>
              {[['daily', '30 ngày'], ['monthly', '6 tháng']].map(([k, label]) => (
                <TouchableOpacity key={k} onPress={() => setMode(k)} style={[styles.tab, mode === k && styles.tabOn]}>
                  <Text style={{ color: mode === k ? '#fff' : '#475569', fontWeight: '700', fontSize: 13 }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Card style={styles.card}><Card.Content>
              <BarChart data={list} />
            </Card.Content></Card>

            <Text style={styles.h}>Chi tiết</Text>
            {rows.length === 0 ? (
              <Text style={styles.sub}>Chưa có chuyến hoàn thành trong khoảng này.</Text>
            ) : rows.map((b, i) => (
              <Card key={i} style={styles.item}><Card.Content>
                <View style={styles.line}>
                  <View>
                    <Text style={styles.bold}>{b.label}</Text>
                    <Text style={styles.sub}>{b.bookings} yêu cầu đặt chỗ · cước {vnd(b.gross)}</Text>
                  </View>
                  <Text style={{ color: '#059669', fontWeight: '700' }}>+{vnd(b.net)}</Text>
                </View>
              </Card.Content></Card>
            ))}
            <Text style={[styles.sub, { marginTop: 8 }]}>
              Thống kê tính theo ngày khởi hành của chuyến.
            </Text>
          </>
        )}
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingRight: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  card: { marginBottom: 12, backgroundColor: '#fff' },
  item: { marginBottom: 8, backgroundColor: '#fff' },
  sub: { color: '#6b7280', fontSize: 13 },
  hero: { borderRadius: 22, paddingVertical: 22, paddingHorizontal: 20, marginBottom: 12, overflow: 'hidden', shadowColor: '#0a9c5a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  heroCircleBig: { position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.09)' },
  heroCircleSmall: { position: 'absolute', right: 40, bottom: -50, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, marginBottom: 14 },
  heroValue: { color: '#fff', fontSize: 42, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
  heroUnit: { color: 'rgba(255,255,255,0.8)', fontSize: 22, fontWeight: '700', marginLeft: 6, marginBottom: 5 },
  heroPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  heroPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  num: { fontSize: 18, fontWeight: '800', marginTop: 4, color: '#0f172a' },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  miniCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  rowTotal: { borderTopWidth: 1, borderTopColor: '#cbd5e1', borderBottomWidth: 0 },
  rowLabel: { flex: 1, color: '#334155', fontSize: 14 },
  rowValue: { fontWeight: '700', fontSize: 14, color: '#0f172a', textAlign: 'right' },
  h: { fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 8 },
  bold: { fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  tabOn: { backgroundColor: colors.primary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 170, gap: 6, paddingTop: 8 },
  barCol: { width: 52, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 22, backgroundColor: '#10b981', borderRadius: 4 },
  barVal: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  barLabel: { fontSize: 9, color: '#6b7280', marginTop: 3 },
});
