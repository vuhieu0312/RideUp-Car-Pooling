import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fileUrl } from '../api/api';
import { Text } from './Typography';

/**
 * Ảnh trong /uploads cần JWT nên phải gửi kèm header Authorization.
 * Bấm vào ảnh để xem phóng to toàn màn hình.
 */
export default function AuthImage({ path, label }) {
  const [token, setToken] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('adminToken').then((t) => setToken(t || '')).catch(() => setToken(''));
  }, []);

  const source = {
    uri: fileUrl(path),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };

  return (
    <View style={styles.wrap}>
      {!!label && <Text variant="bodySmall" style={styles.label}>{label}</Text>}

      {!path ? (
        <View style={styles.empty}><Text variant="bodySmall" style={{ color: '#94a3b8' }}>Chưa có ảnh</Text></View>
      ) : token === null ? (
        <View style={styles.empty}><ActivityIndicator /></View>
      ) : failed ? (
        <View style={styles.empty}><Text variant="bodySmall" style={{ color: '#dc2626' }}>Không tải được ảnh</Text></View>
      ) : (
        <Pressable onPress={() => setZoom(true)}>
          <Image source={source} style={styles.thumb} resizeMode="contain" onError={() => setFailed(true)} />
          <Text variant="labelSmall" style={styles.hint}>Bấm để phóng to</Text>
        </Pressable>
      )}

      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <Pressable style={styles.overlay} onPress={() => setZoom(false)}>
          <Image source={source} style={styles.full} resizeMode="contain" />
          <Text style={styles.close}>Bấm để đóng</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontWeight: '700', marginBottom: 6, color: '#334155' },
  thumb: { width: '100%', height: 220, borderRadius: 8, backgroundColor: '#e2e8f0' },
  hint: { color: '#94a3b8', marginTop: 2, textAlign: 'center' },
  empty: { height: 80, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '85%' },
  close: { color: '#e2e8f0', marginTop: 12 },
});
