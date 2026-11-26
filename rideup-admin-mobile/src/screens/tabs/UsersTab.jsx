import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, TextInput } from 'react-native-paper';
import { Text } from '../../components/Typography';
import { Avatar, CardGrid, Chip, EmptyState, Panel, Pill, Segmented } from '../../components/ui';
import { FONT, accent, colors } from '../../theme';
import { fmtDate, fmtNumber, initialsOf } from '../../utils/format';
import { DRIVER_STATUS, GENDER, label } from '../../utils/labels';

const ACCOUNT_STATUS = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'success', icon: 'check-circle-outline' },
  LOCKED: { label: 'Đã khóa', tone: 'warning', icon: 'lock-outline' },
  BANNED: { label: 'Đã cấm', tone: 'danger', icon: 'cancel' },
};

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'LOCKED', label: 'Đã khóa' },
  { value: 'BANNED', label: 'Đã cấm' },
];

function AccountCard({ user, onDetail, onChangeStatus }) {
  const status = ACCOUNT_STATUS[user.accountStatus] || ACCOUNT_STATUS.ACTIVE;
  return (
    <Panel>
      <View style={styles.head}>
        <Avatar label={initialsOf(user.fullName)} color={user.role === 'DRIVER' ? accent.violet : accent.blue} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{user.fullName}</Text>
          <Text style={styles.meta}>{user.role === 'DRIVER' ? 'Tài xế' : 'Khách hàng'} · Tham gia {fmtDate(user.createdAt)}</Text>
        </View>
        <Pill tone={status.tone} icon={status.icon}>{status.label}</Pill>
      </View>

      <View style={styles.infoRow}>
        <MaterialCommunityIcons name="email-outline" size={16} color="#64748b" />
        <Text style={styles.info} numberOfLines={1}>{user.email}</Text>
      </View>
      <View style={styles.infoRow}>
        <MaterialCommunityIcons name="phone-outline" size={16} color="#64748b" />
        <Text style={styles.info} numberOfLines={1}>{user.phone || 'Chưa cập nhật số điện thoại'}</Text>
      </View>
      {user.role === 'DRIVER' && user.driverStatus && (
        <View style={styles.driverInfo}>
          <Pill tone={user.driverStatus === 'APPROVED' ? 'success' : user.driverStatus === 'REJECTED' ? 'danger' : 'warning'}>
            Hồ sơ: {label(DRIVER_STATUS, user.driverStatus)}
          </Pill>
          {user.driverRating != null && <Text style={styles.driverRating}>★ {Number(user.driverRating).toFixed(1)} · {fmtNumber(user.totalDriverRides)} chuyến</Text>}
        </View>
      )}

      <View style={styles.actions}>
        <Button mode="outlined" compact style={styles.action} onPress={() => onDetail(user)}>Chi tiết</Button>
        <Button
          mode="contained"
          compact
          buttonColor={user.accountStatus === 'ACTIVE' ? colors.danger : accent.green}
          style={styles.action}
          onPress={() => onChangeStatus(user)}
        >
          Chỉnh trạng thái
        </Button>
      </View>
    </Panel>
  );
}

export default function UsersTab({ customers, drivers, loading, onDetail, onChangeStatus }) {
  const [role, setRole] = useState('CUSTOMER');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const users = role === 'CUSTOMER' ? customers : drivers;

  const counts = useMemo(() => ({
    ALL: users.length,
    ACTIVE: users.filter((user) => user.accountStatus === 'ACTIVE').length,
    LOCKED: users.filter((user) => user.accountStatus === 'LOCKED').length,
    BANNED: users.filter((user) => user.accountStatus === 'BANNED').length,
  }), [users]);

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return users.filter((user) => {
      const matchesStatus = statusFilter === 'ALL' || user.accountStatus === statusFilter;
      const matchesSearch = !query || [user.fullName, user.email, user.phone]
        .some((value) => (value || '').toLocaleLowerCase('vi').includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [users, statusFilter, search]);

  return (
    <>
      <Segmented
        value={role}
        onChange={(value) => { setRole(value); setStatusFilter('ALL'); }}
        options={[
          { value: 'CUSTOMER', label: 'Khách hàng', badge: customers.length },
          { value: 'DRIVER', label: 'Tài xế', badge: drivers.length },
        ]}
      />

      <TextInput
        mode="outlined"
        dense
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm theo tên, email hoặc số điện thoại"
        left={<TextInput.Icon icon="magnify" />}
        style={styles.search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {STATUS_FILTERS.map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            count={counts[filter.value]}
            active={statusFilter === filter.value}
            onPress={() => setStatusFilter(filter.value)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={accent.green} />
      ) : (
        <>
          <CardGrid>
            {visibleUsers.map((user) => (
              <AccountCard key={user.id} user={user} onDetail={onDetail} onChangeStatus={onChangeStatus} />
            ))}
          </CardGrid>
          {!visibleUsers.length && <EmptyState icon="account-search-outline" text="Không tìm thấy tài khoản phù hợp" />}
        </>
      )}
    </>
  );
}

export function getAdminUserDetailRows(user) {
  return [
    { title: 'Thông tin tài khoản', rows: [
      ['Họ và tên', user.fullName],
      ['Vai trò', user.role === 'DRIVER' ? 'Tài xế' : 'Khách hàng'],
      ['Email', user.email],
      ['Số điện thoại', user.phone],
      ['Ngày sinh', fmtDate(user.dateOfBirth)],
      ['Giới tính', label(GENDER, user.gender)],
      ['Trạng thái', ACCOUNT_STATUS[user.accountStatus]?.label || user.accountStatus],
      ['Số lần vi phạm', fmtNumber(user.violationCount)],
      ['Ngày tham gia', fmtDate(user.createdAt)],
    ] },
    ...(user.role === 'DRIVER' && (user.driverStatus || user.driverRating != null || user.totalDriverRides != null) ? [{ title: 'Thông tin tài xế', rows: [
      ['Trạng thái hồ sơ', label(DRIVER_STATUS, user.driverStatus)],
      ['Đánh giá', user.driverRating == null ? '—' : `${Number(user.driverRating).toFixed(1)} / 5`],
      ['Số chuyến hoàn thành', fmtNumber(user.totalDriverRides)],
    ] }] : []),
  ];
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { fontFamily: FONT[800], fontSize: 15, color: colors.text },
  meta: { fontFamily: FONT[500], fontSize: 11, color: colors.textMuted, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  info: { flex: 1, fontFamily: FONT[500], fontSize: 12, color: '#334155' },
  driverInfo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  driverRating: { fontFamily: FONT[600], fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1 },
  search: { marginBottom: 12, backgroundColor: colors.surface },
  filters: { marginBottom: 12, flexGrow: 0 },
});
