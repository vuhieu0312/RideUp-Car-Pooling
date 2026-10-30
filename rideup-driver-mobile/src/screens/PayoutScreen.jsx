import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Chip, IconButton, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getPayoutSummary, startPayoutOnboarding, withdrawPayout } from '../api/api';
import { colors } from '../theme';
import { Text } from '../components/Typography';
import { useDialog } from '../components/AppDialog';

/** amount (đơn vị nhỏ nhất của Stripe) -> chuỗi hiển thị, theo exponent của tiền tệ. */
function fmtMoney(amount, currency, exponent) {
  const value = amount / Math.pow(10, exponent || 0);
  const cur = (currency || '').toUpperCase();
  const num = value.toLocaleString('en-US', {
    minimumFractionDigits: exponent || 0,
    maximumFractionDigits: exponent || 0,
  });
  return cur === 'USD' ? `$${num}` : cur === 'VND' ? `${num} ₫` : `${num} ${cur}`;
}

const fmtVnd = (n) => `${Math.round(Number(n || 0)).toLocaleString('en-US')} ₫`;
const fmtTs = (sec) => (sec ? new Date(sec * 1000).toLocaleDateString('vi-VN') : '—');
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('vi-VN') : '—');

const PAYOUT_STATUS = {
  paid: { label: 'Đã chuyển', color: '#10b981' },
  pending: { label: 'Đang xử lý', color: '#f59e0b' },
  in_transit: { label: 'Đang chuyển', color: '#f59e0b' },
  failed: { label: 'Thất bại', color: '#dc2626' },
  canceled: { label: 'Đã huỷ', color: '#6b7280' },
};

function sumLines(list) {
  if (!list || list.length === 0) return ['0'];
  return list.map((m) => fmtMoney(m.amount, m.currency, m.exponent));
}

export default function PayoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState('');
  const openedStripe = useRef(false);

  const load = useCallback(async (quiet) => {
    if (!quiet) setLoading(true);
    try {
      setData(await getPayoutSummary());
    } catch (e) {
      setSnack(e.response?.data?.message || 'Không tải được thông tin ví');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Quay lại app sau khi thiết lập trên trình duyệt -> tải lại trạng thái
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && openedStripe.current) {
        openedStripe.current = false;
        load(true);
      }
    });
    return () => sub.remove();
  }, [load]);

  async function onSetup() {
    setBusy(true);
    try {
      const { url } = await startPayoutOnboarding();
      openedStripe.current = true;
      await Linking.openURL(url);
    } catch (e) {
      setSnack(e.response?.data?.message || 'Không mở được trang thiết lập');
    } finally {
      setBusy(false);
    }
  }

  async function onWithdraw() {
    const ok = await dialog.confirm({
      title: 'Rút tiền',
      message: 'Rút toàn bộ số dư khả dụng về tài khoản ngân hàng / thẻ đã thêm?',
      confirmText: 'Rút',
      cancelText: 'Huỷ',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await withdrawPayout();
      setSnack(`Đã gửi yêu cầu rút ${fmtMoney(r.amount, r.currency, r.exponent)}`);
      await load(true);
    } catch (e) {
      setSnack(e.response?.data?.message || 'Rút tiền thất bại');
    } finally {
      setBusy(false);
    }
  }

  const ready = data && data.hasAccount && data.detailsSubmitted;
  const hasAvailable = data && (data.available || []).some((m) => m.amount > 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Ví & rút tiền</Text>
        <Button mode="text" icon="chart-bar" onPress={() => navigation.navigate('Earnings')}>
          Thống kê
        </Button>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
      >
        {loading && !data ? (
          <Text style={{ textAlign: 'center', padding: 24 }}>Đang tải...</Text>
        ) : !data ? null : !data.configured ? (
          <Card><Card.Content>
            <Text>Hệ thống chưa cấu hình thanh toán Stripe.</Text>
          </Card.Content></Card>
        ) : (
          <>
            {/* Trạng thái tài khoản nhận tiền */}
            {!ready ? (
              <Card style={styles.card}><Card.Content>
                <View style={styles.row}>
                  <MaterialCommunityIcons name="bank-outline" size={22} color={colors.primary} />
                  <Text style={styles.h}>Thiết lập tài khoản nhận tiền</Text>
                </View>
                <Text style={styles.sub}>
                  {data.hasAccount
                    ? 'Bạn chưa hoàn tất thiết lập trên Stripe. Bấm tiếp tục để điền nốt thông tin và thêm thẻ / ngân hàng.'
                    : 'Thêm thẻ hoặc tài khoản ngân hàng trên trang bảo mật của Stripe để nhận 90% cước mỗi chuyến.'}
                </Text>
                <Button
                  mode="contained"
                  icon="open-in-new"
                  onPress={onSetup}
                  loading={busy}
                  disabled={busy}
                  buttonColor={colors.primary}
                  style={{ marginTop: 12 }}
                >
                  {data.hasAccount ? 'Tiếp tục thiết lập' : 'Thiết lập ngay'}
                </Button>
              </Card.Content></Card>
            ) : (
              <>
                {/* Số dư */}
                <Card style={styles.card}><Card.Content>
                  <Text style={styles.sub}>Số dư khả dụng</Text>
                  {sumLines(data.available).map((t, i) => (
                    <Text key={i} style={styles.balance}>{t}</Text>
                  ))}
                  <Text style={[styles.sub, { marginTop: 10 }]}>Đang chờ về (chưa rút được)</Text>
                  {sumLines(data.pending).map((t, i) => (
                    <Text key={i} style={styles.pending}>{t}</Text>
                  ))}
                  <Button
                    mode="contained"
                    icon="cash-fast"
                    onPress={onWithdraw}
                    loading={busy}
                    disabled={busy || !hasAvailable || !data.payoutsEnabled}
                    buttonColor={colors.primary}
                    style={{ marginTop: 14 }}
                  >
                    Rút tiền
                  </Button>
                  {!data.payoutsEnabled && (
                    <Text style={styles.warn}>Tài khoản chưa được bật chức năng rút tiền. Hãy hoàn tất thiết lập.</Text>
                  )}
                  <Button mode="text" onPress={onSetup} disabled={busy} style={{ marginTop: 4 }}>
                    Quản lý thẻ / ngân hàng
                  </Button>
                </Card.Content></Card>

                {data.waitingTransfers > 0 && (
                  <View style={styles.notice}>
                    <Text style={{ color: '#92400e' }}>
                      Có {data.waitingTransfers} chuyến đang chờ chuyển tiền vào ví, kéo xuống để tải lại.
                    </Text>
                  </View>
                )}

                {/* Lịch sử rút */}
                <Text style={styles.section}>Lịch sử rút tiền</Text>
                {(data.payouts || []).length === 0 ? (
                  <Text style={styles.empty}>Chưa có lần rút nào.</Text>
                ) : data.payouts.map((p) => {
                  const st = PAYOUT_STATUS[p.status] || { label: p.status, color: '#6b7280' };
                  return (
                    <Card key={p.id} style={styles.item}><Card.Content>
                      <View style={styles.between}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '700' }}>{fmtMoney(p.amount, p.currency, p.exponent)}</Text>
                          <Text style={styles.sub}>Tạo {fmtTs(p.created)} · về dự kiến {fmtTs(p.arrivalDate)}</Text>
                          {!!p.failureMessage && <Text style={{ color: '#dc2626' }}>{p.failureMessage}</Text>}
                        </View>
                        <Chip mode="flat" style={{ backgroundColor: st.color + '20' }} textStyle={{ color: st.color }}>
                          {st.label}
                        </Chip>
                      </View>
                    </Card.Content></Card>
                  );
                })}
              </>
            )}

            {/* Thu nhập từ các chuyến */}
            <Text style={styles.section}>Thu nhập từ chuyến đi (phí nền tảng {data.feePercent}%)</Text>
            {(data.earnings || []).length === 0 ? (
              <Text style={styles.empty}>Chưa có khoản nào được chuyển. Khoản chuyển xuất hiện khi chuyến hoàn thành và khách thanh toán qua Stripe.</Text>
            ) : data.earnings.map((e, i) => (
              <Card key={i} style={styles.item}><Card.Content>
                <View style={styles.between}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{e.bookingCode}</Text>
                    <Text style={styles.sub}>{fmtDateTime(e.paidAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#059669', fontWeight: '700' }}>
                      +{fmtVnd(Number(e.fare) - Number(e.platformFee))}
                    </Text>
                    <Text style={styles.sub}>Cước {fmtVnd(e.fare)} · phí {fmtVnd(e.platformFee)}</Text>
                  </View>
                </View>
              </Card.Content></Card>
            ))}
          </>
        )}
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingRight: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  card: { marginBottom: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  h: { fontSize: 16, fontWeight: '700' },
  sub: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  balance: { fontSize: 30, fontWeight: '800', color: '#059669' },
  pending: { fontSize: 18, fontWeight: '700', color: '#b45309' },
  warn: { color: '#b45309', fontSize: 12, marginTop: 8 },
  notice: { backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 12 },
  section: { fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  empty: { color: '#6b7280', marginBottom: 8 },
  item: { marginBottom: 8, backgroundColor: '#fff' },
});
