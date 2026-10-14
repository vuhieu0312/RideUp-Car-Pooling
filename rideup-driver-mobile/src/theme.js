import { MD3LightTheme, configureFonts } from 'react-native-paper';

/** RIDEUP DESIGN TOKENS — file này GIỐNG HỆT nhau ở 3 app (customer / driver / admin). */

/* ---------- PALETTE (khác nhau theo app) ---------- */
const PALETTE = {
  primary: '#0caf63',
  primaryDark: '#078d50',
  primaryAccent: '#0a9c5a',   // green dùng cho link / icon / nhấn
  bg: '#f7faf9',
  heroOverlay: 'rgba(4, 45, 38, 0.62)',
  authOverlay: 'rgba(4, 45, 38, 0.67)',
};

/* ---------- MÀU (dùng chung) ---------- */
export const colors = {
  // Brand
  primary: PALETTE.primary,
  primaryDark: PALETTE.primaryDark,
  primaryAccent: PALETTE.primaryAccent,
  primaryLight: '#eaf9f1',
  primaryLighter: '#d7f2eb',
  primaryFaintest: '#eaf7f0',

  // Background
  bg: PALETTE.bg,
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

  // Shadow / overlay
  shadowColor: '#183730',
  cardShadow: 'rgba(24, 55, 48, 0.07)',
  cardShadowStrong: 'rgba(24, 55, 48, 0.12)',
  heroOverlay: PALETTE.heroOverlay,
  authOverlay: PALETTE.authOverlay,
};

/* FONT INTER — bảng map weight → fontFamily Load từ @expo-google-fonts/inter trong App.js. */
export const FONT = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
  900: 'Inter_900Black',
};

/** Thang cỡ chữ chuẩn — dùng thay cho số "lẻ" khi viết style mới. */
export const fontSize = {
  eyebrow: 9,    // kicker / nhãn nhỏ viết hoa
  caption: 10,
  small: 11,
  body: 12,
  bodyLg: 13,
  subtitle: 14,
  section: 16,
  titleSm: 20,
  title: 22,
  display: 27,
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

/** Helper tạo style shadow chuẩn cho cả native (iOS/Android) lẫn web. */
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

export const HERO_IMAGE = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=85';

/** Paper theme — mỗi variant của <Text variant="..."> dùng đúng weight Inter (MD3 mặc định: title/label = Medium, còn lại Regular). */
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
      displayLarge: { fontFamily: FONT[400] },
      displayMedium: { fontFamily: FONT[400] },
      displaySmall: { fontFamily: FONT[400] },
      headlineLarge: { fontFamily: FONT[400] },
      headlineMedium: { fontFamily: FONT[400] },
      headlineSmall: { fontFamily: FONT[400] },
      titleLarge: { fontFamily: FONT[400] },
      titleMedium: { fontFamily: FONT[500] },
      titleSmall: { fontFamily: FONT[500] },
      labelLarge: { fontFamily: FONT[500] },
      labelMedium: { fontFamily: FONT[500] },
      labelSmall: { fontFamily: FONT[500] },
      bodyLarge: { fontFamily: FONT[400] },
      bodyMedium: { fontFamily: FONT[400] },
      bodySmall: { fontFamily: FONT[400] },
    },
  }),
};
