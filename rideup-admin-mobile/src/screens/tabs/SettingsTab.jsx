import { Platform, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { Text, TextInput } from '../../components/Typography';
import { CardGrid, Panel, SectionTitle, StatCard, StatGrid } from '../../components/ui';
import { FONT, accent, colors } from '../../theme';
import { fmtNumber } from '../../utils/format';

const COMMISSION_MAX = 50;
const DEBT_MAX = 10000000;

function SettingField({ value, onChange, maxLength, suffix, onSubmit }) {
  return (
    <View style={styles.field}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={maxLength}
        placeholder="0"
        onSubmitEditing={onSubmit}
      />
      <Text style={styles.suffix}>{suffix}</Text>
    </View>
  );
}

export default function SettingsTab({
  commission, commissionInput, onCommissionInputChange, saving, onSave,
  debtLimit, debtLimitInput, onDebtLimitInputChange, savingDebtLimit, onSaveDebtLimit, locationStats,
}) {
  const parsed = Number(commissionInput);
  const valid = commissionInput !== '' && Number.isInteger(parsed) && parsed >= 0 && parsed <= COMMISSION_MAX;
  const changed = valid && parsed !== commission;

  const debtParsed = Number(debtLimitInput);
  const debtValid = debtLimitInput !== '' && Number.isInteger(debtParsed) && debtParsed >= 0 && debtParsed <= DEBT_MAX;
  const debtChanged = debtValid && debtParsed !== debtLimit;

  return (
    <>
      <CardGrid>
        <Panel>
          <SectionTitle>Hoa hồng nền tảng</SectionTitle>
          <SettingField
            value={commissionInput}
            onChange={onCommissionInputChange}
            maxLength={2}
            suffix="%"
            onSubmit={changed ? onSave : undefined}
          />
          <Button
            mode="contained"
            buttonColor={accent.green}
            loading={saving}
            disabled={saving || !changed}
            onPress={onSave}
            style={{ marginTop: 16 }}
            contentStyle={{ paddingVertical: 4 }}
          >
            Lưu thay đổi
          </Button>
        </Panel>

        <Panel>
          <SectionTitle>Hạn mức nợ tài xế</SectionTitle>
          <SettingField
            value={debtLimitInput}
            onChange={onDebtLimitInputChange}
            maxLength={8}
            suffix="đ"
            onSubmit={debtChanged ? onSaveDebtLimit : undefined}
          />
          <Button
            mode="contained"
            buttonColor={accent.green}
            loading={savingDebtLimit}
            disabled={savingDebtLimit || !debtChanged}
            onPress={onSaveDebtLimit}
            style={{ marginTop: 16 }}
            contentStyle={{ paddingVertical: 4 }}
          >
            Lưu thay đổi
          </Button>
        </Panel>
      </CardGrid>

      <SectionTitle>Dữ liệu địa điểm</SectionTitle>
      <StatGrid>
        <StatCard icon="map-marker-outline" label="Tỉnh/thành" value={fmtNumber(locationStats?.provinces)} color={accent.cyan} />
        <StatCard icon="home-map-marker" label="Phường/xã" value={fmtNumber(locationStats?.wards)} color={accent.orange} />
      </StatGrid>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 14, paddingHorizontal: 16, minHeight: 64,
  },
  input: {
    flex: 1, fontFamily: FONT[800], fontSize: 30, color: colors.text, paddingVertical: 10,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
  },
  suffix: { fontFamily: FONT[800], fontSize: 22, color: colors.textMuted, marginLeft: 8 },
});
