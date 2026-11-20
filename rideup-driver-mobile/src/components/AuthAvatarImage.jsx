import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from 'react-native-paper';

// ảnh /uploads cần JWT mà <Image uri> không gửi được header → tải bằng fetch kèm token rồi đổi sang data URI
export default function AuthAvatarImage({ size, uri, fallback }) {
  const [dataUri, setDataUri] = useState(null);

  useEffect(() => {
    if (!uri) return undefined;
    let alive = true;
    setDataUri(null);
    (async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const res = await fetch(uri, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const result = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (alive) setDataUri(result);
      } catch (e) {
        console.log('[AuthAvatarImage] tải avatar lỗi', uri, e?.message);
      }
    })();
    return () => { alive = false; };
  }, [uri]);

  if (dataUri) return <Avatar.Image size={size} source={{ uri: dataUri }} />;
  return fallback || <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e2e8f0' }} />;
}
