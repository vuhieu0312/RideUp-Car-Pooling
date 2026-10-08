import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Inject global CSS chỉ trên web để bỏ viền focus mặc định của trình duyệt
 * trên <input>/<textarea> (react-native-web render TextInput thành <input>).
 */
const FOCUS_RESET_CSS = `
  /* Font mặc định cho toàn trang — fix inline Text không có fontFamily. */
  body, div, span, p, h1, h2, h3, h4, h5, h6, button, input, textarea, select {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  input:focus, textarea:focus, select:focus, [contenteditable]:focus {
    outline: none !important;
    box-shadow: none !important;
    -webkit-tap-highlight-color: transparent;
  }
`;

export default function GlobalStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    if (document.getElementById('rideup-global-styles')) return undefined;
    const style = document.createElement('style');
    style.id = 'rideup-global-styles';
    style.textContent = FOCUS_RESET_CSS;
    document.head.appendChild(style);
    return () => {
      const node = document.getElementById('rideup-global-styles');
      if (node) node.remove();
    };
  }, []);
  return null;
}
