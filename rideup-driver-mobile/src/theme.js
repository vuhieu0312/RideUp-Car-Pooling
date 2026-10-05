import { MD3LightTheme } from 'react-native-paper';

/** Bảng màu lấy từ web app — driver theme với green primary #08b85c. */
export const colors = {
  primary: '#08b85c',
  primaryDark: '#078d50',
  primaryAccent: '#0a9c5a',
  primaryLight: '#eaf9f1',
  primaryFaintest: '#eaf7f0',

  bg: '#f7faf9',
  surface: '#ffffff',
  surfaceMuted: '#fbfdfc',

  text: '#17312c',
  textSecondary: '#527067',
  textMuted: '#78908a',
  textLabel: '#8a9a95',
  textSubtle: '#84958f',
  textOnPrimary: '#ffffff',
  textDark: '#26473e',

  border: '#e5eeeb',
  borderMuted: '#dfece6',
  borderLight: '#dceae4',
  borderDate: '#d8e8e1',

  success: '#16a34a',
  successBg: '#dcfce7',
  successDark: '#166534',
  warning: '#ea580c',
  warningBg: '#ffedd5',
  warningText: '#9a3412',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  dangerText: '#991b1b',
  dangerLightBg: '#fff1f1',
  pending: '#f59e0b',
  pendingBg: '#fef3c7',

  shadowColor: '#183730',
  cardShadow: 'rgba(24, 55, 48, 0.07)',
  cardShadowStrong: 'rgba(24, 55, 48, 0.12)',
  heroOverlay: 'rgba(4, 45, 38, 0.62)',
  authOverlay: 'rgba(4, 45, 38, 0.67)',
};

export const HERO_IMAGE = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=85';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.textOnPrimary,
    secondary: colors.primaryAccent,
    background: colors.bg,
    surface: colors.surface,
    error: colors.danger,
  },
};