// usePayment.js — Gom logic thanh toán Stripe PaymentSheet vào 1 hook.

import { useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { useStripe } from '@stripe/stripe-react-native';
import { authorizePayment, createPaymentIntent } from '../api/api';
import { useDialog } from '../components/AppDialog';

export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);

  /** Mở PaymentSheet cho booking hiện có. */
  const pay = useCallback(async ({ bookingId, paymentId }) => {
    if (!bookingId || !paymentId) {
      dialog.alert('Không thể thanh toán', 'Vui lòng thử lại sau.');
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
        dialog.alert('Không thể thanh toán', 'Vui lòng thử lại sau.');
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
          dialog.alert('Không thể thanh toán', 'Vui lòng thử lại sau.');
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
        dialog.alert('Thanh toán không thành công', presentError.message || 'Vui lòng kiểm tra lại thẻ và thử lại.');
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
        dialog.alert('Đang xử lý thanh toán', 'Giao dịch của bạn đang được xác nhận.');
        return { success: false, paymentIntentId, authorizeFailed: true };
      }
      return { success: true, paymentIntentId };
    } catch (err) {
      const message = err?.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      dialog.alert('Không thể thanh toán', message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [loading, initPaymentSheet, presentPaymentSheet, dialog]);

  return { pay, loading };
}