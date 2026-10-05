import { MD3LightTheme } from 'react-native-paper';

/**
 * Theme dùng React Native Paper. Màu chính lấy từ web app (xanh emerald #10b981).
 */
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#10b981',
    onPrimary: '#ffffff',
    secondary: '#0ea5e9',
    background: '#f9fafb',
    surface: '#ffffff',
    error: '#dc2626',
  },
};