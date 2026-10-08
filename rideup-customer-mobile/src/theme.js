import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { Platform } from 'react-native';

/**
 * Bảng màu lấy từ web app (src/index.css).
 * Green primary + mint background + neutral grays.
 */
export const colors = {
  // Primary green
  primary: '#0caf63',
  primaryDark: '#078d50',
  primaryAccent: '#0a9c5a',
  primaryLight: '#eaf9f1',
  primaryLighter: '#d7f2eb',
  primaryFaintest: '#eaf7f0',

  // Background
  bg: '#f7faf9',
  surface: '#ffffff',
  surfaceMuted: '#fbfdfc',

  // Text
  text: '#17312c',
  textSecondary: '#527067',
  textMuted: '#78908a',
  textLabel: '#8a9a95',
  textSubtle: '#84958f',
  textOnPrimary: '#ffffff',
  textDark: '#26473e',

  // Borders
  border: '#e5eeeb',
  borderMuted: '#dfece6',
  borderLight: '#dceae4',
  borderDate: '#d8e8e1',

  // Status
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

  // Shadow
  shadowColor: '#183730',
  cardShadow: 'rgba(24, 55, 48, 0.07)',
  cardShadowStrong: 'rgba(24, 55, 48, 0.12)',
  heroOverlay: 'rgba(4, 45, 38, 0.62)',
  authOverlay: 'rgba(4, 45, 38, 0.67)',
};

/* ============================================================
 * FONT INTER — bảng map weight → fontFamily
 * Load từ @expo-google-fonts/inter trong App.js. Nếu font
 * chưa load xong khi render, RN sẽ fallback về System vài giây.
 * ============================================================ */
export const FONT = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
  900: 'Inter_900Black',
};

/** Helper tạo style text nhanh: text('600', 13, colors.text) */
export const text = (weight = '400', size = 14, color = colors.text, opts = {}) => ({
  fontFamily: FONT[weight] || FONT[400],
  fontSize: size,
  color,
  // giữ fontWeight để một số engine vẫn nhận diện
  fontWeight: String(weight),
  ...opts,
});

/**
 * Helper tạo style shadow chuẩn cho cả native (iOS/Android) lẫn web.
 * - Native dùng shadowColor/Offset/Opacity/Radius + elevation (Android).
 * - Web dùng boxShadow CSS (warning "shadow deprecated" sẽ biến mất).
 * Dùng: `card: { ...shadow(8, 0.12, 24) }` hoặc `...shadow(4, 0.2, 12, '#000')`.
 */
export const shadow = (offsetY = 2, opacity = 0.07, blur = 8, color = colors.shadowColor) => {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation: Math.min(8, Math.max(1, Math.round(opacity * 10))),
    boxShadow: `0px ${offsetY}px ${blur}px rgba(${r}, ${g}, ${b}, ${opacity})`,
  };
};

export const typography = {
  fontFamily: FONT[400],
  eyebrow: { fontFamily: FONT[800], fontSize: 9, lineHeight: 12, fontWeight: '800' },
  label: { fontFamily: FONT[600], fontSize: 10, lineHeight: 14, fontWeight: '600' },
  body: { fontFamily: FONT[400], fontSize: 12, lineHeight: 17, fontWeight: '400' },
  bodyStrong: { fontFamily: FONT[700], fontSize: 12, lineHeight: 17, fontWeight: '700' },
  section: { fontFamily: FONT[700], fontSize: 16, lineHeight: 20, fontWeight: '700' },
  title: { fontFamily: FONT[700], fontSize: 22, lineHeight: 27, fontWeight: '700' },
};

/**
 * Paper theme — override fonts để tất cả <Text variant="..."> từ Paper
 * đều dùng Inter thay vì font mặc định của MD3.
 */
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
  fonts: configureFonts({
    config: {
      fontFamily: FONT[400],
    },
  }),
};

export const HERO_IMAGE = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=85';
