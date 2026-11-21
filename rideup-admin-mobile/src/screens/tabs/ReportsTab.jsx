import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import AuthImage from '../../components/AuthImage';
import { Text } from '../../components/Typography';
import { CardGrid, Chip, EmptyState, Panel, Pill, StatCard, StatGrid } from '../../components/ui';
import { FONT, accent, colors } from '../../theme';
import { fmtDateTime, fmtNumber } from '../../utils/format';
import { REPORT_CATEGORY, REPORT_STATUS, label } from '../../utils/labels';

const STATUS_TONE = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };

function ReportCard({ report, selected, onToggle, onReview, onAskApprove, onUnlock, onOpenEvidence }) {
  const pending = report.status === 'PENDING';
  return (
    <Panel style={selected ? styles.selected : null}>
      <View style={styles.head}>
        {pending && (
          <Pressable onPress={onToggle} hitSlop={8}>
            <MaterialCommunityIcons
              name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={selected ? accent.green : '#94a3b8'}
            />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.meta}>{label(REPORT_CATEGORY, report.category)} · {report.bookingCode}</Text>
        </View>
        <Pill tone={STATUS_TONE[report.status]}>{label(REPORT_STATUS, report.status)}</Pill>
      </View>

      <View style={styles.parties}>
        <View style={{ flex: 1 }}>
          <Text style={styles.partyLabel}>Người gửi</Text>
          <Text style={styles.partyName} numberOfLines={1}>{report.reporterName}</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={18} color="#94a3b8" />
        <View style={{ flex: 1 }}>
          <Text style={styles.partyLabel}>Bị khiếu nại</Text>
          <Text style={styles.partyName} numberOfLines={1}>{report.reportedUserName}</Text>
        </View>
      </View>

      <View style={styles.tags}>
        <Pill tone="neutral" icon="alert-outline">Vi phạm: {report.violationCount}</Pill>
        {report.accountStatus === 'LOCKED' && <Pill tone="danger" icon="lock-outline">Tài khoản bị khóa</Pill>}
      </View>

      <Text style={styles.description}>{report.description}</Text>

      {!!report.evidenceUrl && (
        <View style={{ marginTop: 10 }}>
          <AuthImage path={report.evidenceUrl} label="Ảnh bằng chứng" />
          <Button compact icon="open-in-new" onPress={() => onOpenEvidence(report.evidenceUrl)}>Mở bằng chứng</Button>
        </View>
      )}

      {!!report.handledAt && (
        <Text style={styles.handled}>{report.handledByName || 'admin'} xử lý lúc {fmtDateTime(report.handledAt)}</Text>
      )}

      {pending && (
        <View style={styles.actions}>
          <Button mode="outlined" textColor={colors.danger} style={{ flex: 1 }} onPress={() => onReview(report.id, 'REJECTED')}>Từ chối</Button>
          <Button mode="contained" buttonColor={accent.green} style={{ flex: 1 }} onPress={() => onAskApprove({ id: report.id })}>Duyệt</Button>
        </View>
      )}
      {report.accountStatus === 'LOCKED' && (
        <Button mode="outlined" icon="lock-open-variant-outline" style={{ marginTop: 10 }} onPress={() => onUnlock(report.reportedUserId)}>
          Mở khóa tài khoản
        </Button>
      )}
    </Panel>
  );
}

export default function ReportsTab({
  dashboard, reports, selected, onSelect, onReview, onBulk, onAskApprove, onUnlock, onOpenEvidence,
}) {
  const [filter, setFilter] = useState('PENDING');
  const count = (status) => reports.filter((r) => r.status === status).length;
  const visible = filter === 'ALL' ? reports : reports.filter((r) => r.status === filter);
  const visiblePending = visible.filter((r) => r.status === 'PENDING').map((r) => r.id);
  const allSelected = visiblePending.length > 0 && visiblePending.every((id) => selected.includes(id));

  function toggle(id) {
    onSelect(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <>
      <StatGrid>
        <StatCard icon="clock-outline" label="Chờ xử lý" value={fmtNumber(count('PENDING'))} color={accent.amber} />
        <StatCard icon="alert-outline" label="Tổng khiếu nại" value={fmtNumber(dashboard?.reports?.total ?? reports.length)} color={accent.red} />
        <StatCard icon="account-outline" label="Về khách" value={fmtNumber(dashboard?.reports?.byTarget?.CUSTOMER)} color={accent.blue} />
        <StatCard icon="steering" label="Về tài xế" value={fmtNumber(dashboard?.reports?.byTarget?.DRIVER)} color={accent.violet} />
      </StatGrid>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <Chip label="Chờ xử lý" count={count('PENDING')} active={filter === 'PENDING'} onPress={() => setFilter('PENDING')} />
        <Chip label="Đã duyệt" count={count('APPROVED')} active={filter === 'APPROVED'} onPress={() => setFilter('APPROVED')} />
        <Chip label="Đã từ chối" count={count('REJECTED')} active={filter === 'REJECTED'} onPress={() => setFilter('REJECTED')} />
        <Chip label="Tất cả" count={reports.length} active={filter === 'ALL'} onPress={() => setFilter('ALL')} />
      </ScrollView>

      {visiblePending.length > 0 && (
        <Pressable style={styles.selectAll} onPress={() => onSelect(allSelected ? [] : visiblePending)}>
          <MaterialCommunityIcons name={allSelected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={allSelected ? accent.green : '#94a3b8'} />
          <Text style={styles.selectAllText}>Chọn tất cả ({visiblePending.length})</Text>
        </Pressable>
      )}

      {selected.length > 0 && (
        <Panel style={styles.bulk}>
          <Text style={styles.bulkTitle}>Đã chọn {selected.length} khiếu nại</Text>
          <View style={styles.actions}>
            <Button mode="outlined" compact textColor={colors.danger} style={{ flex: 1 }} onPress={() => onBulk('REJECTED')}>Từ chối</Button>
            <Button mode="contained" compact buttonColor={accent.green} style={{ flex: 1 }} onPress={() => onAskApprove({ bulk: true })}>Duyệt</Button>
            <Button mode="text" compact onPress={() => onSelect([])}>Bỏ chọn</Button>
          </View>
        </Panel>
      )}

      <CardGrid>
      {visible.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          selected={selected.includes(report.id)}
          onToggle={() => toggle(report.id)}
          onReview={onReview}
          onAskApprove={onAskApprove}
          onUnlock={onUnlock}
          onOpenEvidence={onOpenEvidence}
        />
      ))}
      </CardGrid>
      {!visible.length && <EmptyState icon="shield-check-outline" text="Không có khiếu nại" />}
    </>
  );
}

const styles = StyleSheet.create({
  selected: { borderWidth: 1.5, borderColor: accent.green },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  title: { fontFamily: FONT[800], fontSize: 15, color: colors.text },
  meta: { fontFamily: FONT[500], fontSize: 12, color: colors.textMuted, marginTop: 2 },
  parties: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 10 },
  partyLabel: { fontFamily: FONT[500], fontSize: 11, color: colors.textMuted },
  partyName: { fontFamily: FONT[700], fontSize: 13, color: colors.text, marginTop: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  description: { fontFamily: FONT[400], fontSize: 13, lineHeight: 19, color: '#334155' },
  handled: { fontFamily: FONT[500], fontSize: 12, color: colors.textMuted, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  selectAllText: { fontFamily: FONT[600], fontSize: 13, color: '#334155' },
  bulk: { backgroundColor: '#ecfdf5' },
  bulkTitle: { fontFamily: FONT[800], fontSize: 14, color: colors.text },
});
