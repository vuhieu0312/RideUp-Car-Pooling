// App.web.js — Phiên bản web, KHÔNG import @stripe/stripe-react-native
// vì Stripe SDK có native-only modules (codegenNativeComponent) gây lỗi
// "Importing native-only module" khi Metro bundle cho web.
//
// Trên web, paymentMethod === 'STRIPE' bị BookingCreateScreen chặn sẵn
// với Alert "Không hỗ trợ trên web", nên việc không có StripeProvider
// không ảnh hưởng flow người dùng.

import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AuthProvider } from './src/auth/AuthContext';
import { FONT, paperTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalStyles from './GlobalStyles';

// Set document.title mặc định trên web — tránh tab "undefined" ở frame đầu
// trước khi React Navigation kịp set title cho screen hiện tại.
if (typeof document !== 'undefined') {
  document.title = 'RideUp';
}

// Gắn fontFamily mặc định (Inter Regular) cho MỌI <Text> không chỉ định fontFamily.
// React Native không có global font, nên dùng defaultProps là cách gọn nhất để
// mọi Text inline (không qua helper `text()`) đều dùng Inter thay vì system font.
if (Text && !Text.defaultProps?.style?.fontFamily) {
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = { fontFamily: FONT[400] };
}

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
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <GlobalStyles />
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <StatusBar style="light" backgroundColor={paperTheme.colors.primary} />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}