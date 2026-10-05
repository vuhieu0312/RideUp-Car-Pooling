import { MD3LightTheme } from 'react-native-paper';

/**
 * Theme cho driver app. Màu chính lấy từ web (xanh lá #08b85c).
 */
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#08b85c',
    onPrimary: '#ffffff',
    secondary: '#10b981',
    background: '#f9fafb',
    surface: '#ffffff',
    error: '#dc2626',
  },
};