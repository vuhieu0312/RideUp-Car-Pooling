import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Button, Dialog, Portal, SegmentedButtons } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerDriver } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import { compressImage } from '../utils/compressImage';
import { colors, FONT, shadow } from '../theme';
import BirthDateField from '../components/BirthDateField';
import DateField from '../components/DateField';
import { Text, TextInput } from '../components/Typography';
import {
  formatDate, GENDERS, normalizePlate, seatsForType, validateAccount, validateIdentity, validateLicense,
  validateVehicle, vehiclePayload, vehicleTypeLabel, VEHICLE_TYPES,
} from '../utils/driverForm';

const DRAFT_KEY = 'driverRegisterDraft';

const STEPS = [
  { key: 'account', title: 'Tạo tài khoản tài xế' },
  { key: 'guide', title: 'Hướng dẫn tải lên giấy tờ' },
  { key: 'cccd', title: 'Thẻ Căn Cước' },
  { key: 'gplx', title: 'Bằng Lái Xe' },
  { key: 'vehicle', title: 'Phương Tiện' },
  { key: 'review', title: 'Xác nhận hồ sơ' },
];

const GUIDE_OK = [
  'Chụp đủ 4 góc giấy tờ, đặt trên nền trơn',
  'Ảnh rõ nét, đủ sáng, đọc được toàn bộ chữ và số',
  'Dùng giấy tờ bản gốc, còn hạn sử dụng',
];

const GUIDE_BAD = [
  'Ảnh bị mờ, lóa sáng hoặc bị che một phần',
  'Ảnh chụp lại từ màn hình hoặc bản photo',
  'Ảnh đã chỉnh sửa, cắt ghép thông tin',
];

const EMPTY_FORM = {
  fullName: '', email: '', password: '', phone: '',
  cccd: '', dateOfBirth: '', gender: '',
  gplx: '', gplxExpiryDate: '',
  plateNumber: '', vehicleBrand: '', vehicleModel: '', vehicleYear: '', vehicleColor: '',
  vehicleType: 'CAR', seatCapacity: '4', registrationExpiryDate: '',
};

const EMPTY_FILES = {
  cccdImageFront: null, cccdImageBack: null, gplxImage: null, vehicleImage: null, registrationImage: null,
};

function validateStep(key, form, files) {
  if (key === 'account') return validateAccount(form);
  if (key === 'cccd') return validateIdentity(form, files);
  if (key === 'gplx') return validateLicense(form, files);
  if (key === 'vehicle') return validateVehicle(form, files);
  return '';
}

export default function DriverRegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { saveSession } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState(EMPTY_FILES);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!raw) return;
      const draft = JSON.parse(raw);
      setForm({ ...EMPTY_FORM, ...draft.form, password: '' });
      if (Platform.OS !== 'web') setFiles({ ...EMPTY_FILES, ...draft.files });
      setStep(Math.min(draft.step || 0, STEPS.length - 1));
      setNotice('Đã khôi phục hồ sơ đang làm dở');
    }).catch(() => {});
  }, []);

  const current = STEPS[step];
  const stepError = validateStep(current.key, form, files);
  const set = (k) => (v) => { setForm((p) => ({ ...p, [k]: v })); setError(''); };
  const setFile = (k) => (f) => { setFiles((p) => ({ ...p, [k]: f })); setError(''); };

  async function saveDraft() {
    const { password, ...rest } = form;
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form: rest, files }));
    setNotice('Đã lưu nháp. Mật khẩu không được lưu, bạn cần nhập lại khi gửi.');
  }

  function goBack() {
    setError('');
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  }

  async function goNext() {
    setNotice('');
    if (stepError) { setError(stepError); return; }
    if (current.key !== 'review') { setStep(step + 1); return; }

    const missing = STEPS.map((s, i) => [i, validateStep(s.key, form, files)]).find(([, e]) => e);
    if (missing) { setStep(missing[0]); setError(missing[1]); return; }

    setLoading(true);
    try {
      const data = await registerDriver({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gplx: form.gplx.trim(),
        ...vehiclePayload(form),
      }, files);
      await AsyncStorage.removeItem(DRAFT_KEY);
      await saveSession(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'white' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.stepCount}>Bước {step + 1}/{STEPS.length}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{current.title}</Text>

        {!!notice && <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View>}

        {current.key === 'account' && (
          <>
            <Text style={styles.subtitle}>Thông tin đăng nhập và liên hệ của bạn.</Text>
            <Field label="Họ và tên" value={form.fullName} onChangeText={set('fullName')} />
            <Field label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Số điện thoại" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="0912345678" />
            <Field label="Mật khẩu (tối thiểu 8 ký tự)" value={form.password} onChangeText={set('password')} secureTextEntry />
          </>
        )}

        {current.key === 'guide' && <Guide />}

        {current.key === 'cccd' && (
          <>
            <UploadRow label="Mặt trước" file={files.cccdImageFront} onChange={setFile('cccdImageFront')} />
            <UploadRow label="Mặt sau" file={files.cccdImageBack} onChange={setFile('cccdImageBack')} />
            <Field label="Số CCCD" value={form.cccd} onChangeText={set('cccd')} keyboardType="numeric" maxLength={12} placeholder="12 chữ số" />
            <Label text="Ngày sinh" />
            <BirthDateField value={form.dateOfBirth} onChange={set('dateOfBirth')} placeholder="Chọn ngày sinh" />
            <Label text="Giới tính" style={{ marginTop: 16 }} />
            <SegmentedButtons
              value={form.gender}
              onValueChange={set('gender')}
              buttons={GENDERS}
              theme={{ colors: { secondaryContainer: colors.primaryFaintest, onSecondaryContainer: colors.primaryAccent } }}
            />
          </>
        )}

        {current.key === 'gplx' && (
          <>
            <UploadRow label="Ảnh bằng lái" file={files.gplxImage} onChange={setFile('gplxImage')} />
            <Field label="Số bằng lái xe" value={form.gplx} onChangeText={set('gplx')} autoCapitalize="characters" />
            <Label text="Ngày hết hạn" />
            <DateField value={form.gplxExpiryDate} onChange={set('gplxExpiryDate')} placeholder="Chọn ngày hết hạn" />
          </>
        )}

        {current.key === 'vehicle' && (
          <>
            <UploadRow label="Ảnh xe" file={files.vehicleImage} onChange={setFile('vehicleImage')} />
            <UploadRow label="Giấy đăng ký xe" file={files.registrationImage} onChange={setFile('registrationImage')} />
            <Field label="Biển số xe" value={form.plateNumber} onChangeText={(v) => set('plateNumber')(v.toUpperCase())} autoCapitalize="characters" placeholder="VD: 29A-12345" />
            <Label text="Loại xe" />
            <SegmentedButtons
              value={form.vehicleType}
              onValueChange={(v) => {
                setForm((p) => ({ ...p, vehicleType: v, seatCapacity: seatsForType(v) || p.seatCapacity }));
                setError('');
              }}
              buttons={VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.short }))}
              style={{ marginBottom: 16 }}
              theme={{ colors: { secondaryContainer: colors.primaryFaintest, onSecondaryContainer: colors.primaryAccent } }}
            />
            <Field label="Số chỗ ngồi" value={form.seatCapacity} onChangeText={set('seatCapacity')} keyboardType="numeric" maxLength={2} />
            <OptionalField label="Hãng xe" value={form.vehicleBrand} onChangeText={set('vehicleBrand')} placeholder="Toyota" />
            <OptionalField label="Dòng xe" value={form.vehicleModel} onChangeText={set('vehicleModel')} placeholder="Vios" />
            <OptionalField label="Năm sản xuất" value={form.vehicleYear} onChangeText={set('vehicleYear')} keyboardType="numeric" maxLength={4} />
            <OptionalField label="Màu xe" value={form.vehicleColor} onChangeText={set('vehicleColor')} placeholder="Trắng" />
            <Text style={styles.fieldLabel}>Hạn đăng kiểm</Text>
            <DateField value={form.registrationExpiryDate} onChange={set('registrationExpiryDate')} placeholder="Chọn ngày (không bắt buộc)" />
          </>
        )}

        {current.key === 'review' && (
          <Review form={form} files={files} onEdit={(i) => { setError(''); setStep(i); }} />
        )}

        {!!error && <View style={styles.alertError}><Text style={styles.alertErrorText}>{error}</Text></View>}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={saveDraft} disabled={loading}>
          <Text style={styles.btnGhostText}>Lưu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, stepError || loading ? styles.btnDisabled : styles.btnPrimary]}
          onPress={goNext}
          disabled={loading}
        >
          <Text style={stepError || loading ? styles.btnDisabledText : styles.btnPrimaryText}>
            {loading ? 'Đang gửi...' : current.key === 'review' ? 'Gửi hồ sơ' : current.key === 'guide' ? 'Tải hồ sơ lên' : 'Kế tiếp'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Label({ text, style }) {
  return (
    <Text style={[styles.fieldLabel, style]}>
      {text} <Text style={styles.required}>*</Text>
    </Text>
  );
}

function OptionalField({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#a4b2ae" {...props} />
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Label text={label} />
      <TextInput style={styles.input} placeholderTextColor="#a4b2ae" {...props} />
    </View>
  );
}

function Guide() {
  return (
    <>
      <Text style={styles.subtitle}>Ảnh giấy tờ rõ ràng giúp hồ sơ được duyệt nhanh hơn.</Text>
      <View style={styles.guideBlock}>
        <View style={styles.guideHead}>
          <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} />
          <Text style={styles.guideTitle}>Yêu cầu:</Text>
        </View>
        {GUIDE_OK.map((t) => <Text key={t} style={styles.guideItem}>•  {t}</Text>)}
      </View>
      <View style={styles.divider} />
      <View style={styles.guideBlock}>
        <View style={styles.guideHead}>
          <MaterialCommunityIcons name="close-circle" size={22} color={colors.danger} />
          <Text style={styles.guideTitle}>Hãy đảm bảo ảnh KHÔNG:</Text>
        </View>
        {GUIDE_BAD.map((t) => <Text key={t} style={styles.guideItem}>•  {t}</Text>)}
      </View>
    </>
  );
}

function UploadRow({ label, file, onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(source) {
    setOpen(false);
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 250));
      let result;
      if (source === 'camera') {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      }
      if (!result.canceled && result.assets?.[0]) {
        onChange(await compressImage(result.assets[0]));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.uploadRow}>
      <Label text={label} style={styles.uploadLabel} />
      <TouchableOpacity style={[styles.uploadBox, file && styles.uploadBoxDone]} onPress={() => setOpen(true)} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : file?.uri ? (
          <Image source={{ uri: file.uri }} style={styles.uploadImage} />
        ) : (
          <>
            <MaterialCommunityIcons name="plus" size={30} color={colors.text} />
            <Text style={styles.uploadText}>Tải ảnh lên</Text>
          </>
        )}
      </TouchableOpacity>

      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)}>
          <Dialog.Title>{label}</Dialog.Title>
          <Dialog.Actions style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <Button mode="contained" icon="camera-outline" buttonColor={colors.primary} onPress={() => pick('camera')}>Chụp ảnh</Button>
            <Button mode="outlined" icon="image-multiple-outline" onPress={() => pick('lib')}>Chọn từ thư viện</Button>
            <Button onPress={() => setOpen(false)}>Huỷ</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function Review({ form, files, onEdit }) {
  const genderLabel = GENDERS.find((g) => g.value === form.gender)?.label;
  const sections = [
    { step: 0, title: 'Tài khoản', rows: [['Họ tên', form.fullName], ['Email', form.email], ['Số điện thoại', form.phone]] },
    {
      step: 2, title: 'Căn cước', rows: [['Số CCCD', form.cccd], ['Ngày sinh', formatDate(form.dateOfBirth)], ['Giới tính', genderLabel]],
      images: [files.cccdImageFront, files.cccdImageBack],
    },
    {
      step: 3, title: 'Bằng lái', rows: [['Số GPLX', form.gplx], ['Hết hạn', formatDate(form.gplxExpiryDate)]],
      images: [files.gplxImage],
    },
    {
      step: 4,
      title: 'Phương tiện',
      rows: [
        ['Biển số', normalizePlate(form.plateNumber)],
        ['Loại xe', vehicleTypeLabel(form.vehicleType)],
        ['Số chỗ', form.seatCapacity],
        ['Hãng / dòng', [form.vehicleBrand, form.vehicleModel].filter(Boolean).join(' ')],
        ['Năm / màu', [form.vehicleYear, form.vehicleColor].filter(Boolean).join(' · ')],
        ['Hạn đăng kiểm', formatDate(form.registrationExpiryDate)],
      ],
      images: [files.vehicleImage, files.registrationImage],
    },
  ];
  return (
    <>
      <Text style={styles.subtitle}>Kiểm tra lại thông tin trước khi gửi cho admin duyệt.</Text>
      {sections.map((s) => (
        <View key={s.title} style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewTitle}>{s.title}</Text>
            <TouchableOpacity onPress={() => onEdit(s.step)}><Text style={styles.editLink}>Sửa</Text></TouchableOpacity>
          </View>
          {s.rows.map(([k, v]) => (
            <View key={k} style={styles.reviewRow}>
              <Text style={styles.reviewKey}>{k}</Text>
              <Text style={styles.reviewValue}>{v || '—'}</Text>
            </View>
          ))}
          {!!s.images && (
            <View style={styles.reviewImages}>
              {s.images.map((f, i) => (f?.uri
                ? <Image key={i} source={{ uri: f.uri }} style={styles.reviewImage} />
                : <View key={i} style={[styles.reviewImage, styles.reviewImageEmpty]} />))}
            </View>
          )}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 },
  stepCount: { fontSize: 12, color: colors.textMuted },
  progressTrack: { height: 4, marginHorizontal: 18, borderRadius: 2, backgroundColor: '#e7ece9' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },

  body: { padding: 22, paddingBottom: 30 },
  title: { fontFamily: FONT[700], fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: colors.textSubtle, marginBottom: 18 },
  notice: { backgroundColor: colors.primaryLight, padding: 10, borderRadius: 8, marginBottom: 14 },
  noticeText: { fontSize: 12, color: colors.primaryDark },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: colors.textDark, marginBottom: 8 },
  required: { color: colors.danger },
  input: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, backgroundColor: 'white', fontSize: 14, color: colors.textDark },

  uploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  uploadLabel: { fontFamily: FONT[700], fontWeight: '700', fontSize: 17, color: colors.text, marginBottom: 0 },
  uploadBox: { width: 140, height: 140, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c9d3cf', backgroundColor: '#f8faf9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  uploadBoxDone: { borderStyle: 'solid', borderColor: colors.primary },
  uploadImage: { width: '100%', height: '100%' },
  uploadText: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },

  guideBlock: { marginBottom: 6 },
  guideHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  guideTitle: { fontFamily: FONT[700], fontWeight: '700', fontSize: 16, color: colors.text },
  guideItem: { fontSize: 14, color: colors.textDark, lineHeight: 22, marginBottom: 6, paddingLeft: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },

  reviewCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 12, ...shadow(2, 0.05, 6), backgroundColor: 'white' },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewTitle: { fontFamily: FONT[700], fontWeight: '700', fontSize: 15, color: colors.text },
  editLink: { fontFamily: FONT[600], fontWeight: '600', color: colors.primaryAccent },
  reviewRow: { flexDirection: 'row', paddingVertical: 4 },
  reviewKey: { width: 110, fontSize: 13, color: colors.textMuted },
  reviewValue: { flex: 1, fontSize: 13, color: colors.textDark },
  reviewImages: { flexDirection: 'row', gap: 8, marginTop: 8 },
  reviewImage: { width: 90, height: 64, borderRadius: 6 },
  reviewImageEmpty: { backgroundColor: '#eef2f0' },

  alertError: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca', padding: 10, borderRadius: 8, marginTop: 8 },
  alertErrorText: { fontSize: 12, color: colors.dangerText },

  bottomBar: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingTop: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f0f3f2' },
  btn: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#f2f4f3' },
  btnGhostText: { fontFamily: FONT[700], fontWeight: '700', fontSize: 15, color: colors.textDark },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontFamily: FONT[700], fontWeight: '700', fontSize: 15, color: 'white' },
  btnDisabled: { backgroundColor: '#f2f4f3' },
  btnDisabledText: { fontFamily: FONT[700], fontWeight: '700', fontSize: 15, color: '#b6bfbc' },
});
