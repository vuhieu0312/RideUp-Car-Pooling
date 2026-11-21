import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Dialog, IconButton, Portal, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  approveDriver, approveVehicle, bulkReviewReports, getAdminDashboardStats, getCommissionSetting, getDebtLimitSetting, getDriverDetail,
  getLocationStats, listDrivers, listPendingVehicles, listReports, rejectDriver, rejectVehicle, reviewReport,
  unlockUser, updateCommissionSetting, updateDebtLimitSetting,
} from '../api/api';
import { useAuth } from '../auth/AuthContext';
import DetailModal from '../components/DetailModal';
import Logo from '../components/Logo';
import { Text } from '../components/Typography';
import { useRealtimeRefresh } from '../realtime/useRealtime';
import { FONT, accent, colors, shadow } from '../theme';
import { buildDetailInfo } from '../utils/detailInfo';
import { initialsOf } from '../utils/format';
import { CONTENT_MAX_WIDTH, useLayout } from '../utils/useLayout';
import ApprovalsTab from './tabs/ApprovalsTab';
import OverviewTab from './tabs/OverviewTab';
import ReportsTab from './tabs/ReportsTab';
import SettingsTab from './tabs/SettingsTab';

const TABS = [
  { key: 'overview', label: 'Tổng quan', icon: 'view-dashboard-outline', active: 'view-dashboard' },
  { key: 'approvals', label: 'Duyệt hồ sơ', icon: 'clipboard-check-outline', active: 'clipboard-check' },
  { key: 'reports', label: 'Khiếu nại', icon: 'shield-alert-outline', active: 'shield-alert' },
  { key: 'settings', label: 'Cấu hình', icon: 'cog-outline', active: 'cog' },
];

const TITLES = {
  overview: 'Tổng quan',
  approvals: 'Duyệt hồ sơ',
  reports: 'Khiếu nại',
  settings: 'Cấu hình',
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const { user, doLogout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [reports, setReports] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [locationStats, setLocationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detail, setDetail] = useState(null);
  const [selectedReports, setSelectedReports] = useState([]);
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [commission, setCommission] = useState(null);
  const [commissionInput, setCommissionInput] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [debtLimit, setDebtLimit] = useState(null);
  const [debtLimitInput, setDebtLimitInput] = useState('');
  const [savingDebtLimit, setSavingDebtLimit] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getAdminDashboardStats(), listDrivers('PENDING'), listPendingVehicles(),
        listReports(null), getLocationStats(), getCommissionSetting(), getDebtLimitSetting(),
      ]);
      const [stats, pendingDrivers, pendingVehicles, allReports, locations, commission, debt] = results.map(
        (r) => (r.status === 'fulfilled' ? r.value : undefined),
      );
      if (stats) setDashboard(stats);
      if (pendingDrivers) setDrivers(pendingDrivers);
      if (pendingVehicles) setVehicles(pendingVehicles);
      if (allReports) setReports(allReports);
      if (locations) setLocationStats(locations);
      if (commission) { setCommission(commission.percent); setCommissionInput(String(commission.percent)); }
      if (debt) { setDebtLimit(debt.limit); setDebtLimitInput(String(debt.limit)); }
      const failed = results.find((r) => r.status === 'rejected');
      if (failed) {
        const err = failed.reason;
        setMsg('Lỗi: ' + (err.response?.data?.message || err.message));
      }
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  useRealtimeRefresh(() => { loadAll(); }, ['ADMIN_QUEUE_UPDATED']);

  async function handleReport(id, status) {
    try {
      const result = await reviewReport(id, status);
      setMsg(status === 'APPROVED' && result.data?.accountStatus === 'LOCKED'
        ? 'Đã duyệt; tài khoản người dùng đã bị khóa' : result.message);
      await loadAll();
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  }

  async function handleBulk(status) {
    if (!selectedReports.length) return;
    try {
      const res = await bulkReviewReports(selectedReports, status);
      setMsg(`Đã xử lý ${res.data?.length ?? 0}/${selectedReports.length} khiếu nại`);
      setSelectedReports([]);
      await loadAll();
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  }

  async function saveCommission() {
    const percent = Number(commissionInput);
    if (!Number.isInteger(percent) || percent < 0 || percent > 50) {
      setMsg('Lỗi: Hoa hồng phải là số nguyên từ 0 đến 50');
      return;
    }
    setSavingCommission(true);
    try {
      const res = await updateCommissionSetting(percent);
      setCommission(res.data.percent);
      setCommissionInput(String(res.data.percent));
      setMsg(res.message);
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setSavingCommission(false);
    }
  }

  async function saveDebtLimit() {
    const limit = Number(debtLimitInput);
    if (debtLimitInput === '' || !Number.isInteger(limit) || limit < 0 || limit > 10000000) {
      setMsg('Lỗi: Hạn mức nợ phải là số nguyên từ 0 đến 10.000.000');
      return;
    }
    setSavingDebtLimit(true);
    try {
      const res = await updateDebtLimitSetting(limit);
      setDebtLimit(res.data.limit);
      setDebtLimitInput(String(res.data.limit));
      setMsg(res.message);
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setSavingDebtLimit(false);
    }
  }

  async function handleUnlock(userId) {
    try {
      const res = await unlockUser(userId);
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  }

  async function confirmApproveReports() {
    const target = confirmApprove;
    setConfirmApprove(null);
    if (!target) return;
    if (target.bulk) await handleBulk('APPROVED');
    else await handleReport(target.id, 'APPROVED');
  }

  async function openEvidence(url) {
    try { await Linking.openURL(url); }
    catch (e) { setMsg('Không thể mở bằng chứng: ' + e.message); }
  }

  async function approveD(id) {
    try { const x = await approveDriver(id); setMsg(x.message); await loadAll(); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
  }

  async function approveV(id) {
    try { const x = await approveVehicle(id); setMsg(x.message); await loadAll(); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
  }

  async function doReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      if (rejectTarget.type === 'driver') await rejectDriver(rejectTarget.id, rejectReason);
      else await rejectVehicle(rejectTarget.id, rejectReason);
      setMsg('Đã từ chối');
      setRejectTarget(null);
      setRejectReason('');
      await loadAll();
    } catch (e) {
      setMsg('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  }

  async function openDriverDetail(d) {
    try { setDetail({ type: 'driver', item: d, data: await getDriverDetail(d.id) }); }
    catch (e) { setMsg('Lỗi: ' + (e.response?.data?.message || e.message)); }
  }

  const info = buildDetailInfo(detail);
  const pendingReports = reports.filter((r) => r.status === 'PENDING').length;
  const badges = { approvals: drivers.length + vehicles.length, reports: pendingReports };
  const isError = msg.startsWith('Lỗi');

  const toast = !!msg && (
    <Pressable onPress={() => setMsg('')} style={[styles.toast, wide && { marginHorizontal: 0, marginTop: 0, marginBottom: 14 }, { backgroundColor: isError ? colors.dangerBg : colors.successBg }]}>
      <MaterialCommunityIcons name={isError ? 'alert-circle-outline' : 'check-circle-outline'} size={18} color={isError ? colors.dangerText : colors.successDark} />
      <Text style={[styles.toastText, { color: isError ? colors.dangerText : colors.successDark }]}>{msg}</Text>
      <MaterialCommunityIcons name="close" size={16} color={isError ? colors.dangerText : colors.successDark} />
    </Pressable>
  );

  const body = loading && !dashboard ? (
    <ActivityIndicator style={{ marginTop: 40 }} color={accent.green} />
  ) : (
    <>
      {tab === 'overview' && <OverviewTab dashboard={dashboard} period={period} onPeriodChange={setPeriod} />}
      {tab === 'approvals' && (
        <ApprovalsTab
          drivers={drivers}
          vehicles={vehicles}
          onDriverDetail={openDriverDetail}
          onVehicleDetail={(v) => setDetail({ type: 'vehicle', item: v })}
          onApproveDriver={approveD}
          onApproveVehicle={approveV}
          onReject={(type, id) => { setRejectTarget({ type, id }); setRejectReason(''); }}
        />
      )}
      {tab === 'reports' && (
        <ReportsTab
          dashboard={dashboard}
          reports={reports}
          selected={selectedReports}
          onSelect={setSelectedReports}
          onReview={handleReport}
          onBulk={handleBulk}
          onAskApprove={setConfirmApprove}
          onUnlock={handleUnlock}
          onOpenEvidence={openEvidence}
        />
      )}
      {tab === 'settings' && (
        <SettingsTab
          commission={commission}
          commissionInput={commissionInput}
          onCommissionInputChange={setCommissionInput}
          saving={savingCommission}
          onSave={saveCommission}
          debtLimit={debtLimit}
          debtLimitInput={debtLimitInput}
          onDebtLimitInputChange={setDebtLimitInput}
          savingDebtLimit={savingDebtLimit}
          onSaveDebtLimit={saveDebtLimit}
          locationStats={locationStats}
        />
      )}
    </>
  );

  const scroller = (
    <ScrollView
      style={[{ flex: 1 }, wide && Platform.OS === 'web' && { overflowY: 'scroll' }]}
      contentContainerStyle={[{ padding: wide ? 28 : 14, paddingBottom: 24 }, wide && styles.wideContent]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} />}
    >
      {wide && <Text style={styles.pageTitle}>{TITLES[tab]}</Text>}
      {wide && toast}
      {body}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, flexDirection: wide ? 'row' : 'column' }}>
      {wide ? (
        <View style={styles.sidebar}>
          <View style={styles.sidebarBrand}>
            <Logo tag="ADMIN" />
          </View>
          <View style={{ flex: 1, paddingTop: 8 }}>
            {TABS.map((t) => {
              const active = tab === t.key;
              const badge = badges[t.key] || 0;
              return (
                <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.navItem, active && styles.navItemActive]}>
                  <MaterialCommunityIcons name={active ? t.active : t.icon} size={22} color={active ? '#fff' : '#94a3b8'} />
                  <Text style={[styles.navLabel, active && { color: '#fff', fontFamily: FONT[800] }]}>{t.label}</Text>
                  {badge > 0 && (
                    <View style={styles.navBadge}>
                      <Text style={styles.tabBadgeText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sidebarUser}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{initialsOf(user?.fullName || user?.email)}</Text>
            </View>
            <Text style={styles.sidebarUserName} numberOfLines={1}>{user?.fullName || user?.email || 'Quản trị viên'}</Text>
            <IconButton icon="logout" onPress={doLogout} iconColor="#cbd5e1" size={20} style={{ margin: 0 }} />
          </View>
        </View>
      ) : (
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <View style={{ flex: 1 }}>
            <Logo size="sm" tag="ADMIN" />
            <Text style={styles.heading}>{TITLES[tab]}</Text>
          </View>
          <View style={styles.userBox}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{initialsOf(user?.fullName || user?.email)}</Text>
            </View>
            <IconButton icon="logout" onPress={doLogout} iconColor="#fff" size={20} style={{ margin: 0 }} />
          </View>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {!wide && toast}
        {scroller}
        {!wide && (
          <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {TABS.map((t) => {
              const active = tab === t.key;
              const badge = badges[t.key] || 0;
              return (
                <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
                  <View>
                    <MaterialCommunityIcons name={active ? t.active : t.icon} size={24} color={active ? accent.green : '#94a3b8'} />
                    {badge > 0 && (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{badge > 99 ? '99+' : badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.tabLabel, active && { color: accent.green, fontFamily: FONT[800] }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <DetailModal
        visible={!!detail}
        title={info.title}
        rows={info.rows}
        sections={info.sections}
        images={info.images}
        imageGroups={info.imageGroups}
        warnings={info.warnings}
        onClose={() => setDetail(null)}
        onApprove={() => { const old = detail; setDetail(null); old?.type === 'driver' ? approveD(old.item.id) : approveV(old.item.id); }}
        onReject={() => { const old = detail; setDetail(null); setRejectTarget({ type: old.type, id: old.item.id }); setRejectReason(''); }} />

      <Portal>
        <Dialog visible={!!rejectTarget} onDismiss={() => setRejectTarget(null)}>
          <Dialog.Title>Lý do từ chối</Dialog.Title>
          <Dialog.Content>
            <TextInput mode="outlined" label="Lý do" value={rejectReason} onChangeText={setRejectReason} multiline numberOfLines={3} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectTarget(null)}>Huỷ</Button>
            <Button mode="contained" buttonColor={colors.danger} disabled={!rejectReason.trim()} onPress={doReject}>Từ chối</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!confirmApprove} onDismiss={() => setConfirmApprove(null)}>
          <Dialog.Title>Xác nhận duyệt khiếu nại</Dialog.Title>
          <Dialog.Content>
            <Text>
              {confirmApprove?.bulk ? `${selectedReports.length} khiếu nại đã chọn sẽ được duyệt. ` : 'Khiếu nại này sẽ được duyệt. '}
              Mỗi khiếu nại được duyệt cộng 1 lần vi phạm cho người bị khiếu nại, đủ ngưỡng thì tài khoản bị khóa. Tài khoản bị khóa có thể mở lại ngay trên thẻ khiếu nại.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmApprove(null)}>Huỷ</Button>
            <Button mode="contained" buttonColor={accent.green} onPress={confirmApproveReports}>Duyệt</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 250, backgroundColor: colors.primary, paddingVertical: 22, paddingHorizontal: 14 },
  sidebarBrand: { paddingHorizontal: 8, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginTop: 6 },
  navItemActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  navLabel: { flex: 1, fontFamily: FONT[600], fontSize: 14, color: '#94a3b8' },
  navBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  sidebarUser: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  sidebarUserName: { flex: 1, fontFamily: FONT[600], fontSize: 13, color: '#e2e8f0' },
  pageHeader: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 4, width: '100%', maxWidth: CONTENT_MAX_WIDTH + 56, alignSelf: 'center' },
  pageTitle: { fontFamily: FONT[800], fontSize: 26, color: colors.text, marginBottom: 16 },
  wideContent: { width: '100%', maxWidth: CONTENT_MAX_WIDTH + 56, alignSelf: 'center' },
  wideToast: { width: '100%', maxWidth: CONTENT_MAX_WIDTH + 56, alignSelf: 'center', paddingHorizontal: 14 },
  topBar: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' },
  heading: { fontFamily: FONT[800], fontSize: 22, color: '#fff', marginTop: 2 },
  userBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  userInitial: { fontFamily: FONT[800], fontSize: 14, color: '#fff' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  toastText: { flex: 1, fontFamily: FONT[600], fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, ...shadow(8, 0.06, 12) },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontFamily: FONT[600], fontSize: 11, color: '#94a3b8' },
  tabBadge: { position: 'absolute', top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontFamily: FONT[800], fontSize: 9, color: '#fff' },
});
