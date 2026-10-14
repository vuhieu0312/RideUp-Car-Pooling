// usePayment.js — Gom logic thanh toán Stripe PaymentSheet vào 1 hook.

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useStripe } from '@stripe/stripe-react-native';
import { authorizePayment, createPaymentIntent } from '../api/api';

export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  /** Mở PaymentSheet cho booking hiện có. */
  const pay = useCallback(async ({ bookingId, paymentId }) => {
    if (!bookingId || !paymentId) {
      Alert.alert('Lỗi', 'Thiếu bookingId hoặc paymentId');
      return { success: false };
    }
    if (loading) {
      return { success: false };  // tránh bấm nhiều lần
    }

    setLoading(true);
    try {
      // (1) Gọi backend tạo PaymentIntent — backend tự validate ownership + tính amount từ DB
      const { clientSecret } = await createPaymentIntent(bookingId);
      if (!clientSecret) {
        Alert.alert('Lỗi', 'Không nhận được client secret từ server');
        return { success: false };
      }
      // clientSecret luôn có dạng "pi_XXXX_secret_YYYY" — PaymentIntent ID là phần trước "_secret_".
      const paymentIntentId = clientSecret.split('_secret_')[0];

      // (2) Init PaymentSheet. returnURL dùng expo-linking để chạy được cả Expo Go lẫn build thật.
      const returnURL = Linking.createURL('stripe-redirect');
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'RideUp',
        paymentIntentClientSecret: clientSecret,
        returnURL,
        defaultBillingDetails: { address: { country: 'VN' } },
      });
      if (initError) {
        // initError.code === 'Canceled' hiếm khi xảy ra, nhưng handle cho chắc
        if (initError.code !== 'Canceled') {
          Alert.alert('Lỗi khởi tạo thanh toán', initError.message);
        }
        return { success: false };
      }

      // (3) Present PaymentSheet — user nhập thẻ. CHỈ trả { error }, không có paymentIntent
      // (xem BUG CŨ #2 ở đầu file) — paymentIntentId đã tự trích từ clientSecret ở bước (1).
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        // User tự huỷ (đóng sheet) → không báo lỗi, im lặng
        if (presentError.code === 'Canceled') {
          return { success: false, canceled: true };
        }
        Alert.alert('Lỗi thanh toán', presentError.message);
        return { success: false };
      }

      // (4) Sheet success — gọi backend authorize để flip Payment + Booking sang HOLDING.
      try {
        await authorizePayment({
          paymentId,
          transactionId: paymentIntentId,
        });
      } catch (authErr) {
        console.warn('authorizePayment failed:', authErr);
        Alert.alert(
          'Đã thanh toán nhưng chưa đồng bộ',
          'Thẻ của bạn đã được xác nhận (tiền đang giữ phía Stripe), nhưng ứng dụng ' +
          'chưa cập nhật được trạng thái booking. Vui lòng kéo refresh ở "Chuyến xe của ' +
          'tôi" sau ít phút, hoặc liên hệ hỗ trợ nếu vẫn thấy "Chờ thanh toán".'
        );
        return { success: false, paymentIntentId, authorizeFailed: true };
      }
      return { success: true, paymentIntentId };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Không rõ lỗi';
      Alert.alert('Lỗi', message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [loading, initPaymentSheet, presentPaymentSheet]);

  return { pay, loading };
}