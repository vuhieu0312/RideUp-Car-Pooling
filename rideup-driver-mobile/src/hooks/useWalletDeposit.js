import { useCallback, useState } from 'react';
import * as Linking from 'expo-linking';
import { useStripe } from '@stripe/stripe-react-native';
import { confirmWalletDeposit, startWalletDepositIntent } from '../api/api';
import { useDialog } from '../components/AppDialog';

export function useWalletDeposit() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);

  const deposit = useCallback(async (amount) => {
    if (loading) return { success: false };
    setLoading(true);
    try {
      const { clientSecret, paymentIntentId } = await startWalletDepositIntent(amount);
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'RideUp',
        paymentIntentClientSecret: clientSecret,
        returnURL: Linking.createURL('stripe-redirect'),
        defaultBillingDetails: { address: { country: 'VN' } },
      });
      if (initError) {
        if (initError.code !== 'Canceled') {
          dialog.alert('Không thể nạp tiền', 'Vui lòng thử lại sau.');
        }
        return { success: false };
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {
          return { success: false, canceled: true };
        }
        dialog.alert('Nạp tiền không thành công', presentError.message || 'Vui lòng kiểm tra lại thẻ và thử lại.');
        return { success: false };
      }

      try {
        const wallet = await confirmWalletDeposit(paymentIntentId);
        return { success: true, wallet };
      } catch (confirmErr) {
        dialog.alert('Đang xử lý nạp tiền', 'Giao dịch của bạn đang được xác nhận, kéo xuống để tải lại ví.');
        return { success: false, pending: true };
      }
    } catch (err) {
      dialog.alert('Không thể nạp tiền', err?.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [loading, initPaymentSheet, presentPaymentSheet, dialog]);

  return { deposit, loading };
}
