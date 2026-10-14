// usePayment.web.js — Stub cho web.

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export function usePayment() {
  const [loading, setLoading] = useState(false);

  const pay = useCallback(async () => {
    Alert.alert(
      'Không hỗ trợ trên web',
      'Thanh toán Stripe chỉ hoạt động trên mobile app. Vui lòng dùng Expo Go (iOS/Android).'
    );
    return { success: false };
  }, []);

  return { pay, loading };
}