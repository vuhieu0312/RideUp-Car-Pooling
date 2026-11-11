import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Button } from 'react-native-paper';
import { resolveMediaUrl } from '../api/api';
import { compressImage } from '../utils/compressImage';
import { FONT } from '../theme';
import { Text } from './Typography';

export default function ImagePickField({ label, file, existingPath, onChange }) {
  const [existingUri, setExistingUri] = useState(null);

  useEffect(() => {
    if (!existingPath) return undefined;
    let alive = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const res = await fetch(resolveMediaUrl(existingPath), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const uri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (alive) setExistingUri(uri);
      } catch {
      }
    })();
    return () => { alive = false; };
  }, [existingPath]);

  async function pick(source) {
    let result;
    if (source === 'camera') {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });
    }
    if (!result.canceled && result.assets?.[0]) {
      onChange(await compressImage(result.assets[0]));
    }
  }

  let source = null;
  if (file?.uri) {
    source = { uri: file.uri };
  } else if (existingUri) {
    source = { uri: existingUri };
  }

  return (
    <View style={styles.wrap}>
      <Text variant="labelMedium" style={styles.label}>{label}</Text>
      {source && <Image source={source} style={styles.image} resizeMode="cover" />}
      {!file?.uri && !!existingPath && (
        <Text variant="bodySmall" style={styles.hint}>Đang dùng ảnh đã gửi trước đó. Chọn ảnh mới nếu muốn thay.</Text>
      )}
      <View style={styles.row}>
        <Button mode="outlined" icon="image-multiple-outline" style={{ flex: 1 }} onPress={() => pick('lib')}>
          {source ? 'Chọn ảnh khác' : 'Chọn ảnh'}
        </Button>
        <Button mode="outlined" icon="camera-outline" style={{ flex: 1 }} onPress={() => pick('camera')}>
          Chụp ảnh
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontFamily: FONT[700], fontWeight: '700', color: '#374151', marginBottom: 6 },
  image: { width: '100%', height: 170, borderRadius: 8, backgroundColor: '#e5e7eb', marginBottom: 6 },
  hint: { color: '#6b7280', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
});
