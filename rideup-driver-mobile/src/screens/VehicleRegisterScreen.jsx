import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerVehicle, resubmitVehicle } from '../api/api';
import IconText from '../components/IconText';
import VehicleFormFields from '../components/VehicleFormFields';
import { colors } from '../theme';
import { validateVehicle, vehiclePayload, vehicleToForm } from '../utils/driverForm';

export default function VehicleRegisterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const editing = route?.params?.vehicle;
  const changing = route?.params?.changing;
  const [form, setForm] = useState(vehicleToForm(editing));
  const [files, setFiles] = useState({ vehicleImage: null, registrationImage: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setError(''); };
  const setFile = (k, f) => { setFiles((p) => ({ ...p, [k]: f })); setError(''); };

  async function submit() {
    const err = validateVehicle(form, {
      vehicleImage: files.vehicleImage || editing?.vehicleImage,
      registrationImage: files.registrationImage || editing?.registrationImage,
    });
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      if (editing) await resubmitVehicle(editing.id, vehiclePayload(form), files);
      else await registerVehicle(vehiclePayload(form), files);
      navigation.navigate('VehicleList');
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký xe thất bại');
    } finally {
      setLoading(false);
    }
  }

  const title = editing ? 'Sửa và gửi lại phương tiện' : changing ? 'Đổi xe' : 'Đăng ký phương tiện';

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <IconText name="car-outline" size={24} variant="headlineSmall" textStyle={{ fontWeight: '700' }}>{title}</IconText>
        {!!editing?.rejectionReason && (
          <HelperText type="error" visible>Lý do bị từ chối: {editing.rejectionReason}</HelperText>
        )}
        <HelperText type="info" visible>
          {changing && !editing
            ? 'Xe hiện tại vẫn dùng bình thường cho tới khi admin duyệt xe mới. Lúc duyệt, xe cũ không được còn chuyến chưa hoàn thành.'
            : 'Sau khi gửi, admin sẽ duyệt. Bạn tạo được chuyến khi xe đã được duyệt.'}
        </HelperText>

        <Card>
          <Card.Content>
            <VehicleFormFields form={form} setField={setField} files={files} setFile={setFile} existing={editing} />
          </Card.Content>
        </Card>

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => navigation.goBack()} disabled={loading}>Huỷ</Button>
          <Button mode="contained" onPress={submit} loading={loading} disabled={loading} buttonColor={colors.primary}>
            {editing ? 'Gửi lại' : 'Gửi duyệt'}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16, marginBottom: 24 },
});
