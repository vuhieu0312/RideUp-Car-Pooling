import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, IconButton, Text } from 'react-native-paper';
import { listMyVehicles } from '../api/api';

const BADGE = (v) => {
  if (v.isVerified && v.isActive) return { label: '✅ Đã duyệt', color: '#10b981' };
  if (v.rejectionReason) return { label: '✖️ Bị từ chối', color: '#dc2626' };
  return { label: '⏳ Chờ admin duyệt', color: '#f59e0b' };
};

const fmtDate = (s) => (s ? s.substring(0, 10) : '—');

export default function VehicleListScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    listMyVehicles().then(setVehicles).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ flex: 1, fontWeight: '700' }}>🚗 Phương tiện của tôi</Text>
        <IconButton icon="plus" onPress={() => navigation.navigate('VehicleRegister')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <Text style={{ textAlign: 'center', padding: 24 }}>Đang tải...</Text>
        ) : vehicles.length === 0 ? (
          <Card><Card.Content>
            <Text style={{ textAlign: 'center' }}>Bạn chưa đăng ký phương tiện nào.</Text>
            <Button mode="contained" onPress={() => navigation.navigate('VehicleRegister')} style={{ marginTop: 12 }}>
              Đăng ký xe ngay
            </Button>
          </Card.Content></Card>
        ) : vehicles.map((v) => {
          const bdg = BADGE(v);
          return (
            <Card key={v.id} style={{ marginBottom: 8 }}>
              <Card.Content>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>🚗 {v.plateNumber}</Text>
                    <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                      {v.vehicleBrand} {v.vehicleModel} {v.vehicleYear && `(${v.vehicleYear})`}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                      {v.vehicleColor} · {v.seatCapacity} chỗ · {v.vehicleType}
                    </Text>
                  </View>
                  <Chip mode="flat" style={{ backgroundColor: bdg.color + '20' }} textStyle={{ color: bdg.color }}>
                    {bdg.label}
                  </Chip>
                </View>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <View><Text variant="bodySmall" style={{ color: '#6b7280' }}>Hạn ĐK</Text><Text style={{ fontWeight: '600' }}>{fmtDate(v.registrationExpiryDate)}</Text></View>
                  <View><Text variant="bodySmall" style={{ color: '#6b7280' }}>Hạn BH</Text><Text style={{ fontWeight: '600' }}>{fmtDate(v.insuranceExpiryDate)}</Text></View>
                </View>
                {!!v.rejectionReason && (
                  <View style={{ backgroundColor: '#fee2e2', padding: 10, borderRadius: 6, marginTop: 8 }}>
                    <Text style={{ color: '#991b1b' }}><Text style={{ fontWeight: '700' }}>Lý do từ chối: </Text>{v.rejectionReason}</Text>
                  </View>
                )}
                {v.isVerified && v.isActive && (
                  <View style={{ backgroundColor: '#dcfce7', padding: 10, borderRadius: 6, marginTop: 8 }}>
                    <Text style={{ color: '#166534' }}>✅ Xe đã được admin duyệt. Bạn có thể tạo chuyến.</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});