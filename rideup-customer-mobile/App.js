import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AuthProvider } from './src/auth/AuthContext';
import { paperTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { DialogProvider } from './src/components/AppDialog';
import RealtimeGate from './src/realtime/RealtimeGate';
import GlobalStyles from './GlobalStyles';

// Set document.title mặc định trên web — tránh tab "undefined" ở frame đầu
// trước khi React Navigation kịp set title cho screen hiện tại.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.title = 'RideUp';
}

// Font Inter mặc định được áp dụng bởi src/components/Typography (Text / TextInput).
// Không dùng Text.defaultProps: React 19 đã bỏ defaultProps nên đoạn đó không còn tác dụng.

/** Root component. */
export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <AuthProvider>
            <RealtimeGate />
            <DialogProvider>
              <GlobalStyles />
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </DialogProvider>
            <StatusBar style="light" backgroundColor={paperTheme.colors.primary} />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
