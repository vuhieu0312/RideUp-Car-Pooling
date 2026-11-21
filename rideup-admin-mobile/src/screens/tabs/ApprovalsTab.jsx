import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { Text } from '../../components/Typography';
import { Avatar, CardGrid, EmptyState, Panel, Pill, Segmented } from '../../components/ui';
import { FONT, accent, colors } from '../../theme';
import { fmtDate, initialsOf } from '../../utils/format';
import { VEHICLE_TYPE, label } from '../../utils/labels';

function InfoLine({ icon, children }) {
  return (
    <View style={styles.info}>
      <MaterialCommunityIcons name={icon} size={15} color="#64748b" />
      <Text style={styles.infoText} numberOfLines={1}>{children}</Text>
    </View>
  );
}

function Actions({ onDetail, onReject, onApprove }) {
  return (
    <View style={styles.actions}>
      <Button mode="outlined" compact style={styles.action} onPress={onDetail}>Chi tiết</Button>
      <Button mode="outlined" compact textColor={colors.danger} style={styles.action} onPress={onReject}>Từ chối</Button>
      <Button mode="contained" compact buttonColor={accent.green} style={styles.action} onPress={onApprove}>Duyệt</Button>
    </View>
  );
}

export default function ApprovalsTab({
  drivers, vehicles, onDriverDetail, onVehicleDetail, onApproveDriver, onApproveVehicle, onReject,
}) {
  const [view, setView] = useState('drivers');

  return (
    <>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'drivers', label: 'Tài xế', badge: drivers.length },
          { value: 'vehicles', label: 'Phương tiện', badge: vehicles.length },
        ]}
      />

      {view === 'drivers' && (
        <>
          <CardGrid>
          {drivers.map((d) => (
            <Panel key={d.id}>
              <View style={styles.head}>
                <Avatar label={initialsOf(d.fullName)} color={accent.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{d.fullName}</Text>
                  <Text style={styles.meta}>Nộp {fmtDate(d.createdAt)}</Text>
                </View>
                <Pill tone="warning" icon="clock-outline">Chờ duyệt</Pill>
              </View>
              <InfoLine icon="email-outline">{d.email}</InfoLine>
              <InfoLine icon="phone-outline">{d.phone}</InfoLine>
              <InfoLine icon="card-account-details-outline">CCCD {d.cccd} · GPLX {d.gplx}</InfoLine>
              <Actions
                onDetail={() => onDriverDetail(d)}
                onReject={() => onReject('driver', d.id)}
                onApprove={() => onApproveDriver(d.id)}
              />
            </Panel>
          ))}
          </CardGrid>
          {!drivers.length && <EmptyState icon="account-check-outline" text="Không có tài xế chờ duyệt" />}
        </>
      )}

      {view === 'vehicles' && (
        <>
          <CardGrid>
          {vehicles.map((v) => (
            <Panel key={v.id}>
              <View style={styles.head}>
                <Avatar icon="car-outline" color={accent.violet} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{v.plateNumber}</Text>
                  <Text style={styles.meta}>{label(VEHICLE_TYPE, v.vehicleType)} · {v.seatCapacity} chỗ</Text>
                </View>
                <Pill tone="warning" icon="clock-outline">Chờ duyệt</Pill>
              </View>
              <InfoLine icon="account-outline">{v.driverName} · {v.driverPhone}</InfoLine>
              <InfoLine icon="calendar-outline">Hạn đăng kiểm {fmtDate(v.registrationExpiryDate)}</InfoLine>
              <Actions
                onDetail={() => onVehicleDetail(v)}
                onReject={() => onReject('vehicle', v.id)}
                onApprove={() => onApproveVehicle(v.id)}
              />
            </Panel>
          ))}
          </CardGrid>
          {!vehicles.length && <EmptyState icon="car-outline" text="Không có phương tiện chờ duyệt" />}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { fontFamily: FONT[800], fontSize: 15, color: colors.text },
  meta: { fontFamily: FONT[500], fontSize: 12, color: colors.textMuted, marginTop: 1 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  infoText: { flex: 1, fontFamily: FONT[500], fontSize: 13, color: '#334155' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  action: { flex: 1 },
});
