import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, SegmentedButtons, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resubmitDriverProfile } from '../api/api';
import BirthDateField from '../components/BirthDateField';
import DateField from '../components/DateField';
import ImagePickField from '../components/ImagePickField';
import { Text } from '../components/Typography';
import VehicleFormFields from '../components/VehicleFormFields';
import { colors, FONT } from '../theme';
import {
  GENDERS, validateContact, validateIdentity, validateLicense, validateVehicle, vehiclePayload, vehicleToForm,
} from '../utils/driverForm';

export default function DriverResubmitScreen({ profile, rejectionReason, onDone, onCancel }) {
  const insets = useSafeAreaInsets();
  const vehicle = profile?.vehicle;
  const vehicleLocked = vehicle?.status === 'ACTIVE';
  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    dateOfBirth: profile?.dateOfBirth || '',
    gender: profile?.gender || '',
    cccd: profile?.cccd || '',
    gplx: profile?.gplx || '',
    gplxExpiryDate: profile?.gplxExpiryDate || '',
    ...vehicleToForm(vehicle),
  });
  const [files, setFiles] = useState({
    cccdImageFront: null, cccdImageBack: null, gplxImage: null, vehicleImage: null, registrationImage: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setError(''); };
  const setFile = (k, f) => { setFiles((p) => ({ ...p, [k]: f })); setError(''); };

  const images = {
    cccdImageFront: files.cccdImageFront || profile?.cccdImageFront,
    cccdImageBack: files.cccdImageBack || profile?.cccdImageBack,
    gplxImage: files.gplxImage || profile?.gplxImage,
    vehicleImage: files.vehicleImage || vehicle?.vehicleImage,
    registrationImage: files.registrationImage || vehicle?.registrationImage,
  };

  async function submit() {
    const err = validateContact(form)
      || validateIdentity(form, images)
      || validateLicense(form, images)
      || (vehicleLocked ? '' : validateVehicle(form, images));
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const body = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        cccd: form.cccd,
        gplx: form.gplx.trim(),
        gplxExpiryDate: form.gplxExpiryDate,
        ...(vehicleLocked ? {} : vehiclePayload(form)),
      };
      const upload = vehicleLocked
        ? { cccdImageFront: files.cccdImageFront, cccdImageBack: files.cccdImageBack, gplxImage: files.gplxImage }
        : files;
      await resubmitDriverProfile(body, upload);
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || 'Gửi lại hồ sơ thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text variant="headlineSmall" style={styles.title}>Sửa và gửi lại hồ sơ</Text>
      {!!rejectionReason && (
        <View style={styles.reason}>
          <Text style={{ color: colors.dangerText }}>
            <Text style={[styles.bold, { color: colors.dangerText }]}>Lý do bị từ chối: </Text>{rejectionReason}
          </Text>
        </View>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.section}>Thông tin cá nhân</Text>
          <TextInput mode="outlined" label="Họ và tên *" value={form.fullName}
            onChangeText={(v) => setField('fullName', v)} style={styles.input} />
          <TextInput mode="outlined" label="Số điện thoại *" keyboardType="phone-pad" value={form.phone}
            onChangeText={(v) => setField('phone', v)} style={styles.input} />
          <Text style={styles.label}>Ngày sinh *</Text>
          <BirthDateField value={form.dateOfBirth} onChange={(v) => setField('dateOfBirth', v)} placeholder="Chọn ngày sinh" />
          <Text style={[styles.label, { marginTop: 12 }]}>Giới tính *</Text>
          <SegmentedButtons
            value={form.gender}
            onValueChange={(v) => setField('gender', v)}
            buttons={GENDERS}
            theme={{ colors: { secondaryContainer: colors.primaryFaintest, onSecondaryContainer: colors.primaryAccent } }}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.section}>Căn cước</Text>
          <TextInput mode="outlined" label="Số CCCD (12 số) *" keyboardType="numeric" maxLength={12} value={form.cccd}
            onChangeText={(v) => setField('cccd', v)} style={styles.input} />
          <ImagePickField label="CCCD mặt trước" file={files.cccdImageFront} existingPath={profile?.cccdImageFront}
            onChange={(f) => setFile('cccdImageFront', f)} />
          <ImagePickField label="CCCD mặt sau" file={files.cccdImageBack} existingPath={profile?.cccdImageBack}
            onChange={(f) => setFile('cccdImageBack', f)} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.section}>Bằng lái xe</Text>
          <TextInput mode="outlined" label="Số GPLX *" autoCapitalize="characters" value={form.gplx}
            onChangeText={(v) => setField('gplx', v)} style={styles.input} />
          <Text style={styles.label}>Ngày hết hạn *</Text>
          <DateField value={form.gplxExpiryDate} onChange={(v) => setField('gplxExpiryDate', v)} placeholder="Chọn ngày hết hạn" />
          <View style={{ height: 12 }} />
          <ImagePickField label="Ảnh bằng lái" file={files.gplxImage} existingPath={profile?.gplxImage}
            onChange={(f) => setFile('gplxImage', f)} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.section}>Phương tiện</Text>
          {vehicleLocked ? (
            <Text style={styles.note}>
              Xe {vehicle.plateNumber} đang dùng được giữ nguyên. Muốn đổi xe, hãy vào "Phương tiện của tôi" sau khi hồ sơ được duyệt.
            </Text>
          ) : (
            <VehicleFormFields form={form} setField={setField} files={files} setFile={setFile} existing={vehicle} />
          )}
        </Card.Content>
      </Card>

      {!!error && <HelperText type="error" visible>{error}</HelperText>}

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCancel} disabled={loading}>Huỷ</Button>
        <Button mode="contained" onPress={submit} loading={loading} disabled={loading} buttonColor={colors.primary}>
          Gửi lại hồ sơ
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f9fafb', flexGrow: 1 },
  title: { fontFamily: FONT[700], fontWeight: '700' },
  bold: { fontFamily: FONT[700], fontWeight: '700' },
  reason: { backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginTop: 12 },
  card: { marginTop: 12 },
  section: { fontFamily: FONT[700], fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 10 },
  label: { fontFamily: FONT[600], fontWeight: '600', fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  input: { marginBottom: 10 },
  note: { color: colors.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16, marginBottom: 24 },
});
