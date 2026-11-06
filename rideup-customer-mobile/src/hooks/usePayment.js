
import { useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { useStripe } from '@stripe/stripe-react-native';
import { authorizePayment, createPaymentIntent } from '../api/api';
import { useDialog } from '../components/AppDialog';

export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);

  const pay = useCallback(async ({ bookingId, paymentId }) => {
    if (!bookingId || !paymentId) {
      dialog.alert('Không thể thanh toán', 'Vui lòng thử lại sau.');
      return { success: false };
    }
    if (loading) {
      return { success: false };
    }

    setLoading(true);
    try {
      // backend tự kiểm tra chủ booking và tính amount
      const { clientSecret } = await createPaymentIntent(bookingId);
      if (!clientSecret) {
        dialog.alert('Không thể thanh toán', 'Vui lòng thử lại sau.');
        return { success: false };
      }
      // clientSecret dạng pi_XXX_secret_YYY, lấy PI id là phần trước _secret_
      const paymentIntentId = clientSecret.split('_secret_')[0];

      // returnURL dùng expo-linking để chạy được cả Expo Go lẫn build thật
      const returnURL = Linking.createURL('stripe-redirect');
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'RideUp',
        paymentIntentClientSecret: clientSecret,
        returnURL,
        defaultBillingDetails: { address: { country: 'VN' } },
      });
      if (initError) {
        if (initError.code !== 'Canceled') {
          dialog.alert('Không thể thanh toán', 'Vui lòng thử lại sau.');
        }
        return { success: false };
      }

      // present chỉ trả { error }, không có paymentIntent
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        // user tự đóng sheet thì không báo lỗi
        if (presentError.code === 'Canceled') {
          return { success: false, canceled: true };
        }
        dialog.alert('Thanh toán không thành công', presentError.message || 'Vui lòng kiểm tra lại thẻ và thử lại.');
        return { success: false };
      }

      // thành công thì gọi authorize để payment sang HOLDING
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