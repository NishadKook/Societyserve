import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService, type CreateOrderResponse } from '@/services/payment.service';

type PaymentState = 'loading' | 'checkout' | 'verifying' | 'success' | 'failed';

export default function PaymentCheckoutScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PaymentState>('loading');
  const [orderDetails, setOrderDetails] = useState<CreateOrderResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const webviewRef = useRef<WebView>(null);

  const createOrderMutation = useMutation({
    mutationFn: () => paymentService.createOrder(bookingId).then((r) => r.data),
    onSuccess: (data) => {
      setOrderDetails(data);
      setState('checkout');
    },
    onError: () => {
      setErrorMsg('Could not create payment order. Please try again.');
      setState('failed');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: paymentService.verifyPayment,
    onSuccess: () => {
      setState('success');
      void queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
    onError: () => {
      setErrorMsg('Payment verification failed. If money was deducted, it will be refunded.');
      setState('failed');
    },
  });

  // Start order creation when component mounts
  const hasStarted = useRef(false);
  if (!hasStarted.current) {
    hasStarted.current = true;
    createOrderMutation.mutate();
  }

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.event === 'payment.success') {
        setState('verifying');
        verifyMutation.mutate({
          razorpayOrderId: message.data.razorpay_order_id,
          razorpayPaymentId: message.data.razorpay_payment_id,
          razorpaySignature: message.data.razorpay_signature,
        });
      } else if (message.event === 'payment.error') {
        setErrorMsg(message.data?.description || 'Payment failed. Please try again.');
        setState('failed');
      } else if (message.event === 'payment.dismiss') {
        setErrorMsg('Payment was cancelled.');
        setState('failed');
      }
    } catch {
      // ignore non-JSON messages
    }
  }, [bookingId]);

  const buildCheckoutHtml = (order: CreateOrderResponse): string => {
    const amountInRupees = (order.amount / 100).toFixed(2);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 40px 20px; font-family: -apple-system, sans-serif; background: #F9FAFB; text-align: center; }
    .amount { font-size: 32px; font-weight: 700; color: #111827; margin: 20px 0 8px; }
    .label { font-size: 14px; color: #6B7280; }
    .spinner { margin: 40px auto; }
    .error { color: #DC2626; margin: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <p class="label">Amount to pay</p>
  <p class="amount">Rs. ${amountInRupees}</p>
  <p class="label">Opening Razorpay...</p>
  <div class="spinner" id="spinner"></div>
  <p class="error" id="error" style="display:none"></p>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    try {
      var options = {
        key: '${order.keyId}',
        amount: '${order.amount}',
        currency: '${order.currency}',
        order_id: '${order.orderId}',
        name: 'SocietyServe',
        description: 'Service Payment',
        theme: { color: '#2563EB' },
        handler: function(response) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'payment.success',
            data: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }
          }));
        },
        modal: {
          ondismiss: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'payment.dismiss',
              data: {}
            }));
          },
          escape: false,
          confirm_close: true
        }
      };

      var rzp = new Razorpay(options);

      rzp.on('payment.failed', function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          event: 'payment.error',
          data: {
            code: response.error.code,
            description: response.error.description
          }
        }));
      });

      rzp.open();
    } catch(e) {
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').innerText = 'Failed to load payment: ' + e.message;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        event: 'payment.error',
        data: { description: e.message }
      }));
    }
  </script>
</body>
</html>`;
  };

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Creating payment order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'checkout' && orderDetails) {
    return (
      <SafeAreaView style={styles.safe}>
        <WebView
          ref={webviewRef}
          source={{ html: buildCheckoutHtml(orderDetails) }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          style={styles.webview}
        />
      </SafeAreaView>
    );
  }

  if (state === 'verifying') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Verifying payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSubtext}>Your payment has been processed successfully.</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              router.back();
            }}
          >
            <Text style={styles.doneBtnText}>Back to Booking</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // failed state
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.failIcon}>
          <Text style={styles.failIconText}>!</Text>
        </View>
        <Text style={styles.failTitle}>Payment Failed</Text>
        <Text style={styles.failSubtext}>{errorMsg}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setState('loading');
            setErrorMsg('');
            createOrderMutation.mutate();
          }}
        >
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  webview: { flex: 1 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#6B7280' },

  // Success
  successIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successIconText: { fontSize: 36, color: '#059669', fontWeight: '700' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  doneBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Fail
  failIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  failIconText: { fontSize: 36, color: '#DC2626', fontWeight: '700' },
  failTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  failSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  retryBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48, marginBottom: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  backBtn: { paddingVertical: 10 },
  backBtnText: { color: '#6B7280', fontSize: 14 },
});
