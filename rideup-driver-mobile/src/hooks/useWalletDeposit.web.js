import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { startWalletDeposit } from '../api/api';
import { useDialog } from '../components/AppDialog';

export function useWalletDeposit() {
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);

  const deposit = useCallback(async (amount) => {
    setLoading(true);
    try {
      const { url, sessionId } = await startWalletDeposit(amount);
      await Linking.openURL(url);
      return { success: false, redirected: true, sessionId };
    } catch (err) {
      dialog.alert('Không thể nạp tiền', err?.response?.data?.message || 'Không mở được trang nạp tiền');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [dialog]);

  return { deposit, loading };
}
