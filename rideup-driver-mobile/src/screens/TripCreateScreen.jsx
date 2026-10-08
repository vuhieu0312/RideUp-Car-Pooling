import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, HelperText, IconButton } from 'react-native-paper';
import { createTrip, listMyVehicles, listProvinces, listWards } from '../api/api';
import { colors, FONT, shadow, typography } from '../theme';
import WardMultiPicker from '../components/WardMultiPicker';
import DateField from '../components/DateField';
import TimeField from '../components/TimeField';

/**
 * Tạo chuyến xe.
 * Lưu ý: KHÔNG dùng Paper Menu / Paper Card ở đây vì cả hai dùng Portal + Animated.View
 * khiến ScrollView tự nhảy xuống dưới khi screen mount. Thay bằng Modal RN thuần
 * và View styling thủ công.
 */
export default function TripCreateScreen({ navigation }) {
  const [provinces, setProvinces] = useState([]);
  const [pickupWards, setPickupWards] = useState([]);
  const [dropoffWards, setDropoffWards] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openPicker, setOpenPicker] = useState(null); // 'fromP' | 'toP' | 'vehicle'

  const [form, setForm] = useState({
    startProvinceId: '', endProvinceId: '',
    pickupWardIds: [], dropoffWardIds: [],
    departureDate: '', departureTime: '',
    seatTotal: 4, priceVnd: 120000, note: '',
    vehicleId: '',
  });

  useEffect(() => {
    listProvinces().then(setProvinces).catch(() => {});
    listMyVehicles().then(setVehicles).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.startProvinceId) {
      listWards(form.startProvinceId).then(setPickupWards).catch(() => setPickupWards([]));
    } else {
      setPickupWards([]);
    }
  }, [form.startProvinceId]);

  useEffect(() => {
    if (form.endProvinceId) {
      listWards(form.endProvinceId).then(setDropoffWards).catch(() => setDropoffWards([]));
    } else {
      setDropoffWards([]);
    }
  }, [form.endProvinceId]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  function toggleWard(field, id) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id)
        ? f[field].filter((x) => x !== id)
        : f[field].length >= 4
          ? f[field]
          : [...f[field], id],
    }));
  }

  async function submit() {
    setError('');
    if (!form.startProvinceId || !form.endProvinceId) { setError('Chọn tỉnh đón và trả'); return; }
    if (form.startProvinceId === form.endProvinceId) { setError('Tỉnh đón và tỉnh trả phải khác'); return; }
    if (form.pickupWardIds.length === 0 || form.dropoffWardIds.length === 0) { setError('Chọn ít nhất 1 điểm đón và 1 điểm trả'); return; }
    if (!form.departureDate || !form.departureTime) { setError('Chọn ngày giờ khởi hành'); return; }
    if (!form.vehicleId) { setError('Chọn xe'); return; }

    setLoading(true);
    try {
      const stops = [
        ...form.pickupWardIds.map((id) => ({ stopType: 'PICKUP', wardId: id })),
        ...form.dropoffWardIds.map((id) => ({ stopType: 'DROPOFF', wardId: id })),
      ];
      await createTrip({
        startProvinceId: form.startProvinceId,
        endProvinceId: form.endProvinceId,
        stops,
        departureTime: `${form.departureDate}T${form.departureTime}:00`,
        seatTotal: Number(form.seatTotal),
        priceVnd: Number(form.priceVnd),
        note: form.note || null,
      });
      navigation.goBack();
    } catch (e) {
      setError(e.response?.data?.message || 'Tạo chuyến thất bại');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" iconColor={colors.textDark} onPress={() => navigation.goBack()} />
        <View>
          <Text style={styles.headerTitle}>Tạo chuyến xe</Text>
          <Text style={styles.headerSubtitle}>Thêm chuyến xe vào lịch trình</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Section 1 — Tuyến đường */}
        <Section title="1. Tuyến đường">
          <PickerField
            label="Tỉnh đón *"
            value={form.startProvinceId}
            options={provinces}
            isOpen={openPicker === 'fromP'}
            onOpen={() => setOpenPicker('fromP')}
            onClose={() => setOpenPicker(null)}
            onSelect={(id) => { set('startProvinceId')(id); setOpenPicker(null); }}
          />
          <WardMultiPicker
            label="Khu vực đón"
            required
            wards={pickupWards}
            selectedIds={form.pickupWardIds}
            onToggle={(id) => toggleWard('pickupWardIds', id)}
          />
          <PickerField
            label="Tỉnh trả *"
            value={form.endProvinceId}
            options={provinces}
            isOpen={openPicker === 'toP'}
            onOpen={() => setOpenPicker('toP')}
            onClose={() => setOpenPicker(null)}
            onSelect={(id) => { set('endProvinceId')(id); setOpenPicker(null); }}
          />
          <WardMultiPicker
            label="Khu vực trả"
            required
            wards={dropoffWards}
            selectedIds={form.dropoffWardIds}
            onToggle={(id) => toggleWard('dropoffWardIds', id)}
          />
        </Section>

        {/* Section 2 — Lịch khởi hành */}
        <Section title="2. Lịch khởi hành">
          <View style={styles.row}>
            <View style={styles.inputFlex}>
              <Text style={styles.fieldLabel}>Ngày đi *</Text>
              <DateField value={form.departureDate} onChange={set('departureDate')} placeholder="Chọn ngày" />
            </View>
            <View style={styles.inputFlex}>
              <Text style={styles.fieldLabel}>Giờ đi *</Text>
              <TimeField value={form.departureTime} onChange={set('departureTime')} placeholder="Chọn giờ" />
            </View>
          </View>
        </Section>

        {/* Section 3 — Số ghế */}
        <Section title="3. Số ghế">
          <TextInput
            style={styles.input}
            placeholder="Số ghế *"
            placeholderTextColor={colors.textSubtle}
            value={String(form.seatTotal)}
            onChangeText={(v) => set('seatTotal')(Number(v) || 1)}
            keyboardType="numeric"
          />
        </Section>

        {/* Section 4 — Giá vé */}
        <Section title="Giá vé (VND/khách)">
          <TextInput
            style={styles.input}
            placeholder="Giá vé (VND) *"
            placeholderTextColor={colors.textSubtle}
            value={String(form.priceVnd)}
            onChangeText={(v) => set('priceVnd')(Number(v) || 0)}
            keyboardType="numeric"
          />
        </Section>

        {/* Section 5 — Ghi chú */}
        <Section title="4. Ghi chú (tùy chọn)">
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Ví dụ: Có đón dọc đường, đón linh hoạt..."
            placeholderTextColor={colors.textSubtle}
            value={form.note}
            onChangeText={set('note')}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Section>

        {/* Section 6 — Thông tin xe */}
        <Section title="5. Thông tin xe">
          {vehicles.length === 0 ? (
            <HelperText type="info" visible>Bạn chưa có xe. Vào "Phương tiện của tôi" để đăng ký.</HelperText>
          ) : (
            <PickerField
              label="Xe *"
              value={form.vehicleId}
              options={vehicles.map((v) => ({
                id: v.id,
                name: `${v.plateNumber} · ${v.vehicleType} · ${v.seatCapacity} chỗ`,
              }))}
              isOpen={openPicker === 'vehicle'}
              onOpen={() => setOpenPicker('vehicle')}
              onClose={() => setOpenPicker(null)}
              onSelect={(id) => { set('vehicleId')(id); setOpenPicker(null); }}
            />
          )}
        </Section>

        {!!error && <HelperText type="error" visible style={styles.error}>{error}</HelperText>}

        <Button mode="contained" onPress={submit} loading={loading} disabled={loading}
          buttonColor={colors.primary} textColor="#fff" style={styles.submit} contentStyle={styles.submitContent} labelStyle={styles.submitLabel}>
          {loading ? 'Đang tạo...' : 'Tạo chuyến xe'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- Section wrapper thay thế Paper Card ---------- */
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/* ---------- Picker dùng Modal RN thuần (không Portal) ---------- */
function PickerField({ label, value, options, isOpen, onOpen, onClose, onSelect }) {
  const selected = options.find((o) => o.id === value);
  const [keyword, setKeyword] = useState('');

  // Reset keyword khi đóng modal
  useEffect(() => {
    if (!isOpen) setKeyword('');
  }, [isOpen]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return options;
    return options.filter((o) => o.name.toLowerCase().includes(k));
  }, [options, keyword]);

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={onOpen} activeOpacity={0.7}>
        <Text style={[styles.pickerText, !selected && styles.pickerPlaceholder]} numberOfLines={1}>
          {selected?.name || 'Chọn...'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primaryAccent} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <Text style={styles.modalHeader}>{label}</Text>
            <View style={styles.pickerSearchWrap}>
              <MaterialCommunityIcons name="magnify" size={16} color={colors.textSubtle} style={styles.pickerSearchIcon} />
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                placeholder="Tìm kiếm..."
                placeholderTextColor={colors.textSubtle}
                style={styles.pickerSearchInput}
                autoFocus
                underlineColorAndroid="transparent"
              />
              {keyword.length > 0 && (
                <TouchableOpacity onPress={() => setKeyword('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textSubtle} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filtered.length === 0 ? (
                <Text style={styles.modalEmpty}>
                  {keyword ? `Không tìm thấy "${keyword}"` : 'Không có dữ liệu'}
                </Text>
              ) : (
                filtered.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.modalOption, value === opt.id && styles.modalOptionActive]}
                    onPress={() => onSelect(opt.id)}
                  >
                    <Text style={[styles.modalOptionText, value === opt.id && styles.modalOptionTextActive]}>
                      {opt.name}
                    </Text>
                    {value === opt.id && (
                      <MaterialCommunityIcons name="check" size={18} color={colors.primaryAccent} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2, backgroundColor: colors.bg },
  headerTitle: { ...typography.title, color: colors.text, fontSize: 18, lineHeight: 22 },
  headerSubtitle: { ...typography.body, color: colors.textSubtle, fontSize: 11, lineHeight: 15 },

  content: { padding: 14, paddingBottom: 100 },

  // Section wrapper — thay Paper Card
  section: {
    marginBottom: 12,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionBody: { padding: 13 },
  sectionTitle: { ...typography.section, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 4, color: colors.textDark, fontSize: 14, lineHeight: 19 },

  row: { flexDirection: 'row', gap: 8 },
  inputFlex: { flex: 1 },
  input: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
    fontSize: 13,
    color: colors.text,
  },
  noteInput: { minHeight: 86, paddingTop: 10 },

  fieldLabel: { ...typography.label, marginTop: 9, marginBottom: 5, color: colors.textSecondary, fontSize: 11 },

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
  },
  pickerText: { flex: 1, fontFamily: FONT[600], fontSize: 13, fontWeight: '600', color: colors.text },
  pickerPlaceholder: { color: colors.textSubtle, fontWeight: '400' },

  // Modal chọn option — thay Paper Menu
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '70%',
    ...shadow(4, 0.2, 12, '#000'),
  },
  modalHeader: {
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 13, fontWeight: '700', color: colors.textDark,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderDate,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  pickerSearchIcon: { marginRight: 6 },
  pickerSearchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    boxShadow: 'none',
  },
  modalList: { maxHeight: 380 },
  modalEmpty: { padding: 24, textAlign: 'center', color: colors.textSubtle, fontSize: 13 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  modalOptionActive: { backgroundColor: colors.primaryFaintest },
  modalOptionText: { flex: 1, fontSize: 13, color: colors.text },
  modalOptionTextActive: { color: colors.primaryAccent, fontWeight: '700' },

  error: { marginHorizontal: 14, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.dangerLightBg },
  submit: { marginTop: 8, marginHorizontal: 14, borderRadius: 9 },
  submitContent: { paddingVertical: 5 },
  submitLabel: { fontFamily: FONT[700], fontSize: 13, fontWeight: '700' },
});