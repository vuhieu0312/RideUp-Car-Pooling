// PaymentWebViewScreen.jsx — Thanh toán Stripe qua WebView + Stripe.js (Payment Element).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authorizePayment, createPaymentIntent } from '../api/api';
import { colors } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../components/Typography';
import { useDialog } from '../components/AppDialog';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

function buildHtml({ clientSecret, publishableKey, amountLabel }) {
  // JSON.stringify để escape an toàn khi chèn string vào script.
  const cs = JSON.stringify(clientSecret);
  const pk = JSON.stringify(publishableKey);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: -apple-system, Roboto, sans-serif; background: #f4f8f6; }
    #payment-element { margin-bottom: 16px; }
    #amount { font-size: 13px; color: #5c6b65; margin-bottom: 14px; }
    #pay-btn {
      width: 100%; padding: 14px; border: none; border-radius: 8px;
      background: #0caf63; color: white; font-size: 15px; font-weight: 700;
    }
    #pay-btn:disabled { opacity: 0.6; }
    #error-message { color: #dc2626; font-size: 12px; margin-top: 10px; min-height: 16px; }
  </style>
</head>
<body>
  <div id="amount">Số tiền thanh toán: <b>${amountLabel}</b></div>
  <div id="payment-element"></div>
  <button id="pay-btn">Thanh toán</button>
  <div id="error-message"></div>
  <script>
    const stripe = Stripe(${pk});
    const elements = stripe.elements({
      clientSecret: ${cs},
      appearance: { theme: 'stripe', variables: { colorPrimary: '#0caf63' } },
    });
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');

    const btn = document.getElementById('pay-btn');
    const errEl = document.getElementById('error-message');

    function post(payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      errEl.textContent = '';
      try {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: 'if_required',
        });
        if (error) {
          errEl.textContent = error.message || 'Thanh toán thất bại';
          btn.disabled = false;
          post({ type: 'error', message: error.message });
          return;
        }
        post({ type: 'success', paymentIntentId: paymentIntent.id, status: paymentIntent.status });
      } catch (e) {
        errEl.textContent = 'Có lỗi xảy ra, vui lòng thử lại';
        btn.disabled = false;
        post({ type: 'error', message: String(e) });
      }
    });
  </script>
</body>
</html>`;
}

export default function PaymentWebViewScreen({ route, navigation }) {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { bookingId, paymentId, bookingCode, totalAmount } = route.params || {};
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorizing, setAuthorizing] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setError('Không tìm thấy booking');
      setLoading(false);
      return;
    }
    let cancelled = false;
    createPaymentIntent(bookingId)
      .then(({ clientSecret: cs }) => {
        if (cancelled) return;
        if (!cs) {
          setError('Không khởi tạo được thanh toán');
          return;
        }
        setClientSecret(cs);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.message || 'Không khởi tạo được thanh toán');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookingId]);

  const amountLabel = useMemo(
    () => `${new Intl.NumberFormat('vi-VN').format(totalAmount || 0)} đ`,
    [totalAmount]
  );

  const html = useMemo(() => {
    if (!clientSecret || !STRIPE_PUBLISHABLE_KEY) return '';
    return buildHtml({ clientSecret, publishableKey: STRIPE_PUBLISHABLE_KEY, amountLabel });
  }, [clientSecret, amountLabel]);

  const handleMessage = useCallback(async (event) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (data.type === 'success') {
      setAuthorizing(true);
      try {
        await authorizePayment({ paymentId, transactionId: data.paymentIntentId });
      } catch (e) {
        // Không chặn UX — webhook Stripe sẽ đồng bộ lại nếu call optimistic này lỗi
        console.warn('authorizePayment failed (webhook sẽ retry):', e?.message);
      } finally {
        setAuthorizing(false);
      }
      dialog.alert(
        'Đặt cọc thành công',
        'Booking của bạn đang chờ tài xế xác nhận.'
      );
      navigation.navigate('MyBookingsTab');
    }
    // type 'error' → lỗi đã hiện ngay trong WebView (error-message), không cần Alert chồng
  }, [paymentId, navigation, dialog]);

  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Thiếu cấu hình EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY trong .env
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={18} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán{bookingCode ? ` · ${bookingCode}` : ''}</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Đang khởi tạo thanh toán...</Text>
        </View>
      )}

      {!loading && !!error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && !!html && (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMessage}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
      )}

      {authorizing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f6' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12,
    backgroundColor: '#0caf63',
  },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  closeIcon: { color: 'white', fontSize: 16, fontWeight: '700' },
  headerTitle: { color: 'white', fontSize: 15, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  muted: { fontSize: 12, color: colors.textSubtle },
  errorText: { fontSize: 13, color: colors.danger, textAlign: 'center' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
});
