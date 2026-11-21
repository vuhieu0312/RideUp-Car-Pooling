import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Chip, IconButton, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  confirmWalletDeposit, getPayoutSummary, getWalletSummary, startPayoutOnboarding,
} from '../api/api';
import { useWalletDeposit } from '../hooks/useWalletDeposit';
import { colors } from '../theme';
import { Text } from '../components/Typography';
import { useDialog } from '../components/AppDialog';

const fmtVnd = (n) => `${Math.round(Number(n || 0)).toLocaleString('en-US')} ₫`;
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('vi-VN') : '—');

const WALLET_TYPE_LABEL = {
  DEPOSIT: () => 'Nạp tiền',
  COMMISSION: (t) => `Hoa hồng tiền mặt ${t.bookingCode || ''}`,
  DEBT_OFFSET: (t) => `Trừ nợ từ chuyến ${t.bookingCode || ''}`,
};

export default function PayoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState('');
  const openedStripe = useRef(false);
  const depositSession = useRef(null);
  const { deposit, loading: depositing } = useWalletDeposit();

  const load = useCallback(async (quiet) => {
    if (!quiet) setLoading(true);
    try {
      const [summary, walletData] = await Promise.all([
        getPayoutSummary(),
        getWalletSummary().catch(() => null),
      ]);
      setData(summary);
      if (walletData) setWallet(walletData);
    } catch (e) {
      setSnack(e.response?.data?.message || 'Không tải được thông tin ví');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') return;
      if (depositSession.current) {
        const sessionId = depositSession.current;
        depositSession.current = null;
        confirmWalletDeposit(sessionId)
          .then((w) => { setWallet(w); setSnack('Đã cập nhật ví hoa hồng'); })
          .catch(() => setSnack('Chưa ghi nhận được giao dịch nạp tiền, kéo xuống để tải lại'))
          .finally(() => load(true));
      } else if (openedStripe.current) {
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

  async function onDeposit() {
    const result = await deposit();
    if (result.sessionId) {
      depositSession.current = result.sessionId;
    }
    if (result.success) {
      if (result.wallet) setWallet(result.wallet);
      setSnack('Đã cập nhật ví hoa hồng');
      load(true);
    }
  }

  const overLimit = !!wallet && Number(wallet.debt) > Number(wallet.debtLimit || 0);
  const ready = data && data.hasAccount && data.detailsSubmitted;
  const walletColors = overLimit ? ['#ef4444', '#b91c1c', '#7f1d1d'] : Number(wallet?.debt) > 0 ? ['#f59e0b', '#d97706', '#92400e'] : ['#0a9c5a', '#0b6e4f', '#0f3d33'];
  const meterPct = !wallet ? 0 : Number(wallet.debtLimit) > 0 ? Math.min(100, (Number(wallet.debt) / Number(wallet.debtLimit)) * 100) : Number(wallet.debt) > 0 ? 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Ví & công nợ</Text>
        <Button mode="text" icon="chart-bar" onPress={() => navigation.navigate('Earnings')}>
          Thống kê
        </Button>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
      >
        {wallet && (
          <>
            <LinearGradient colors={walletColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroCircleBig} />
              <View style={styles.heroCircleSmall} />
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <MaterialCommunityIcons name={overLimit ? 'alert-circle-outline' : 'wallet-outline'} size={20} color="#fff" />
                </View>
                <Text style={styles.heroLabel}>Số dư ví hoa hồng</Text>
              </View>
              <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{fmtVnd(wallet.balance)}</Text>
              <Text style={styles.heroSub}>Chuyến thu tiền mặt bị trừ {wallet.feePercent}% hoa hồng vào ví này</Text>

              <View style={styles.meter}>
                <View style={[styles.meterFill, { width: `${meterPct}%` }]} />
              </View>
              <View style={styles.meterLabels}>
                <Text style={styles.meterText}>Đang nợ {fmtVnd(wallet.debt)}</Text>
                <Text style={styles.meterText}>Hạn mức {fmtVnd(wallet.debtLimit)}</Text>
              </View>
            </LinearGradient>

            {overLimit && (
              <View style={styles.alert}>
                <MaterialCommunityIcons name="lock-alert-outline" size={20} color="#b91c1c" />
                <Text style={styles.alertText}>
                  Hoa hồng đang nợ đã vượt hạn mức nên bạn không thể tạo chuyến, bắt đầu chuyến hay duyệt booking mới. Hãy nạp tiền để tiếp tục.
                </Text>
              </View>
            )}

            <Button
              mode="contained"
              icon="cash-plus"
              onPress={onDeposit}
              loading={depositing}
              disabled={busy || depositing || !wallet.depositEnabled}
              buttonColor={wallet.debt > 0 ? '#dc2626' : colors.primary}
              style={styles.depositBtn}
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontSize: 15, fontWeight: '700' }}
            >
              {wallet.debt > 0 ? `Nạp ${fmtVnd(Math.max(wallet.debt, wallet.minDeposit))} để trả nợ` : 'Nạp tiền'}
            </Button>

            {(wallet.transactions || []).length > 0 && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Giao dịch gần đây</Text>
                {wallet.transactions.slice(0, 5).map((t, idx, arr) => {
                  const negative = Number(t.amount) < 0;
                  return (
                    <View key={t.id} style={[styles.txRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.txIcon, { backgroundColor: negative ? '#fee2e2' : '#dcfce7' }]}>
                        <MaterialCommunityIcons
                          name={negative ? 'arrow-top-right' : 'arrow-bottom-left'}
                          size={16}
                          color={negative ? '#dc2626' : '#16a34a'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txTitle} numberOfLines={1}>{WALLET_TYPE_LABEL[t.type]?.(t) || t.type}</Text>
                        <Text style={styles.sub}>{fmtDateTime(t.createdAt)}</Text>
                      </View>
                      <Text style={[styles.txAmount, { color: negative ? '#dc2626' : '#059669' }]}>
                        {Number(t.amount) > 0 ? '+' : ''}{fmtVnd(t.amount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

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
                    : 'Thêm thẻ hoặc tài khoản ngân hàng trên trang bảo mật của Stripe để nhận tiền cước thanh toán qua thẻ.'}
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
                  <Button mode="text" onPress={onSetup} disabled={busy}>
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
                      +{fmtVnd(Number(e.fare) - Number(e.platformFee) - Number(e.debtDeducted || 0))}
                    </Text>
                    <Text style={styles.sub}>
                      Cước {fmtVnd(e.fare)} · phí {fmtVnd(e.platformFee)}
                      {Number(e.debtDeducted) > 0 ? ` · trừ nợ ${fmtVnd(e.debtDeducted)}` : ''}
                    </Text>
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
  title: { fontSize: 18, fontWeight: '800', flex: 1 },
  card: { marginBottom: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  h: { fontSize: 16, fontWeight: '700' },
  sub: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  balance: { fontSize: 30, fontWeight: '800', color: '#059669' },
  pending: { fontSize: 18, fontWeight: '700', color: '#b45309' },
  hero: { borderRadius: 22, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 6 },
  heroCircleBig: { position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.09)' },
  heroCircleSmall: { position: 'absolute', right: 40, bottom: -50, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -0.5, marginTop: 14 },
  heroSub: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 4, marginBottom: 16 },
  meter: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  meterLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meterText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fee2e2', borderRadius: 14, padding: 12, marginBottom: 12 },
  alertText: { flex: 1, color: '#991b1b', fontSize: 13, lineHeight: 19 },
  depositBtn: { borderRadius: 14, marginBottom: 14 },
  panel: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  panelTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  warn: { color: '#b45309', fontSize: 12, marginTop: 8 },
  notice: { backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 12 },
  section: { fontSize: 15, fontWeight: '700', marginTop: 4, marginBottom: 10 },
  empty: { color: '#6b7280', marginBottom: 8 },
  item: { marginBottom: 8, backgroundColor: '#fff', borderRadius: 14 },
});
