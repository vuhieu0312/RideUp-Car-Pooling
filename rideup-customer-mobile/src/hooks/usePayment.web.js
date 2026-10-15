// usePayment.web.js — Stub cho web.

import { useCallback, useState } from 'react';
import { useDialog } from '../components/AppDialog';

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const pay = useCallback(async () => {
    dialog.alert(
      'Không hỗ trợ trên web',
      'Thanh toán bằng thẻ chỉ dùng được trên ứng dụng di động.'
    );
    return { success: false };
  }, [dialog]);

  return { pay, loading };
}