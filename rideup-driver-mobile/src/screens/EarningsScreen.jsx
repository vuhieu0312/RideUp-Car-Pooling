import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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

/** Biểu đồ cột đơn giản (không cần thư viện): mỗi cột = thực nhận của 1 ngày/tháng. */
function BarChart({ data }) {
  const max = Math.max(1, ...data.map((b) => Number(b.net)));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
            <Card style={styles.card}><Card.Content>
              <Text style={styles.sub}>Tổng thực nhận (chuyến đã hoàn thành)</Text>
              <Text style={styles.big}>{vnd(data.totalNet)}</Text>
              <View style={styles.grid}>
                <View style={styles.cell}><Text style={styles.sub}>Hôm nay</Text><Text style={styles.num}>{vnd(data.todayNet)}</Text></View>
                <View style={styles.cell}><Text style={styles.sub}>Tháng này</Text><Text style={styles.num}>{vnd(data.monthNet)}</Text></View>
              </View>
            </Card.Content></Card>

            <View style={styles.grid}>
              <View style={[styles.cell, styles.tile]}><Text style={styles.tileNum}>{data.trips}</Text><Text style={styles.sub}>Chuyến</Text></View>
              <View style={[styles.cell, styles.tile]}><Text style={styles.tileNum}>{data.bookings}</Text><Text style={styles.sub}>Lượt đặt</Text></View>
              <View style={[styles.cell, styles.tile]}><Text style={styles.tileNum}>{data.seats}</Text><Text style={styles.sub}>Ghế bán</Text></View>
            </View>

            <Card style={styles.card}><Card.Content>
              <Text style={styles.h}>Cơ cấu thu nhập</Text>
              <View style={styles.line}><Text>Doanh thu (cước)</Text><Text style={styles.bold}>{vnd(data.totalGross)}</Text></View>
              <View style={styles.line}><Text>Phí nền tảng ({data.feePercent}% thanh toán Stripe)</Text><Text style={[styles.bold, { color: '#dc2626' }]}>-{vnd(data.totalFee)}</Text></View>
              <View style={styles.line}><Text>Nhận qua Stripe (vào ví)</Text><Text style={styles.bold}>{vnd(data.stripeNet)}</Text></View>
              <View style={styles.line}><Text>Thu tiền mặt trực tiếp</Text><Text style={styles.bold}>{vnd(data.cashNet)}</Text></View>
            </Card.Content></Card>

            <View style={styles.tabs}>
              {[['daily', '30 ngày'], ['monthly', '6 tháng']].map(([k, label]) => (
                <TouchableOpacity key={k} onPress={() => setMode(k)} style={[styles.tab, mode === k && styles.tabOn]}>
                  <Text style={{ color: mode === k ? '#fff' : colors.primary, fontWeight: '700' }}>{label}</Text>
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
                    <Text style={styles.sub}>{b.bookings} lượt đặt · cước {vnd(b.gross)}</Text>
                  </View>
                  <Text style={{ color: '#059669', fontWeight: '700' }}>+{vnd(b.net)}</Text>
                </View>
              </Card.Content></Card>
            ))}
            <Text style={[styles.sub, { marginTop: 8 }]}>
              Thống kê tính theo ngày khởi hành của chuyến. Tiền mặt do tài xế thu trực tiếp nên không trừ phí.
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
  big: { fontSize: 30, fontWeight: '800', color: '#059669', marginVertical: 4 },
  num: { fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  cell: { flex: 1 },
  tile: { backgroundColor: '#fff', padding: 12, borderRadius: 10, alignItems: 'center' },
  tileNum: { fontSize: 22, fontWeight: '800' },
  h: { fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 8 },
  bold: { fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.primary },
  tabOn: { backgroundColor: colors.primary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 170, gap: 6, paddingTop: 8 },
  barCol: { width: 52, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 22, backgroundColor: '#10b981', borderRadius: 4 },
  barVal: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  barLabel: { fontSize: 9, color: '#6b7280', marginTop: 3 },
});
