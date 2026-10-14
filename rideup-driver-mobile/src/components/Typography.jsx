import { createContext, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { FONT } from '../theme';

/** Text / TextInput dùng chung của RideUp (giống nhau ở cả 3 app). */
const WEIGHT_ALIAS = { normal: 400, bold: 700 };

function familyForWeight(w) {
  if (w >= 900) return FONT[900];
  if (w >= 800) return FONT[800];
  if (w >= 700) return FONT[700];
  if (w >= 600) return FONT[600];
  if (w >= 500) return FONT[500];
  return FONT[400];
}

// Trả về fontFamily cần ép (hoặc null nếu giữ nguyên style gốc)
function resolveFamily(flat) {
  if (flat.fontFamily) return null;
  if (flat.fontWeight == null) return null;
  const w = WEIGHT_ALIAS[flat.fontWeight] ?? Number(flat.fontWeight);
  return Number.isFinite(w) ? familyForWeight(w) : null;
}

// Text lồng trong Text thì kế thừa font của cha, không gán lại Regular
const NestedText = createContext(false);

export function Text({ style, variant, children, ...props }) {
  const nested = useContext(NestedText);
  const flat = StyleSheet.flatten(style) || {};
  const forced = resolveFamily(flat);
  const isInter = typeof flat.fontFamily === 'string' && flat.fontFamily.startsWith('Inter_');
  let finalStyle = style;
  // Đã có file Inter đúng weight thì đặt fontWeight: 'normal' để Android không "bold chồng bold"
  if (forced || isInter) finalStyle = [style, { fontFamily: forced || flat.fontFamily, fontWeight: 'normal' }];
  else if (!variant && !nested && !flat.fontFamily) finalStyle = [{ fontFamily: FONT[400] }, style];

  const Comp = variant ? PaperText : RNText;
  return (
    <NestedText.Provider value>
      <Comp {...(variant ? { variant } : null)} style={finalStyle} {...props}>{children}</Comp>
    </NestedText.Provider>
  );
}

export function TextInput({ style, ...props }) {
  const flat = StyleSheet.flatten(style) || {};
  const isInter = typeof flat.fontFamily === 'string' && flat.fontFamily.startsWith('Inter_');
  const family = flat.fontFamily ? (isInter ? flat.fontFamily : null) : (resolveFamily(flat) || FONT[400]);
  const finalStyle = family ? [style, { fontFamily: family, fontWeight: 'normal' }] : style;
  return <RNTextInput style={finalStyle} {...props} />;
}
