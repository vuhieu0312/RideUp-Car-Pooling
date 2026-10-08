import { StatusBar } from 'expo-status-bar';
import { Platform, Text } from 'react-native';
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
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.title = 'RideUp';
}

// Gắn fontFamily mặc định (Inter Regular) cho MỌI <Text> không chỉ định fontFamily.
// React Native không có global font, nên dùng defaultProps là cách gọn nhất để
// mọi Text inline (không qua helper `text()`) đều dùng Inter thay vì system font.
if (Text && !Text.defaultProps?.style?.fontFamily) {
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = { fontFamily: FONT[400] };
}

/**
 * Root component. Đợi font Inter load xong mới render UI
 * (tránh flash font mặc định trong vài frame đầu).
 */
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
    <>
      <GlobalStyles />
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <AuthProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
            <StatusBar style="light" backgroundColor={paperTheme.colors.primary} />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </>
  );
}
