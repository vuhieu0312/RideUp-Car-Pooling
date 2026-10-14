import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Typography';

/** Icon + chữ trên một dòng (thay emoji). */
const MARGIN_KEYS = ['margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginVertical', 'marginHorizontal'];

export default function IconText({
  name, size, color, gap = 6, center, style, textStyle, children, ...textProps
}) {
  const flat = StyleSheet.flatten(textStyle) || {};
  const box = {};
  const text = {};
  Object.keys(flat).forEach((k) => {
    if (MARGIN_KEYS.includes(k)) box[k] = flat[k];
    else text[k] = flat[k];
  });
  const iconSize = size || Math.round((flat.fontSize || 12) * 1.25);
  const iconColor = color || flat.color || '#475569';
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, center && { justifyContent: 'center' }, box, style]}>
      <MaterialCommunityIcons name={name} size={iconSize} color={iconColor} />
      <Text style={[text, { flexShrink: 1 }]} {...textProps}>{children}</Text>
    </View>
  );
}
