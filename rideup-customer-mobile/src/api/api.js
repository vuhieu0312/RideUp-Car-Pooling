import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { DeviceEventEmitter } from 'react-native';

/** Tự detect base URL theo thứ tự ưu tiên — đổi WiFi không cần sửa file */
const DEV_PORT = 8080;

function resolveBaseUrl() {
  // 1. Web (browser) → dùng localhost, browser cùng máy backend
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return `http://localhost:${DEV_PORT}/api`;
  }
  // 2. Native (Expo Go qua QR LAN) → lấy IP LAN của máy dev từ hostUri
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${DEV_PORT}/api`;
    }
  }
  // 3. Override thủ công qua env hoặc extra (prod/tunnel/IP tĩnh)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const extra = Constants.expoConfig?.extra?.apiUrl;
  if (extra && extra !== `http://localhost:${DEV_PORT}/api`) {
    return extra;
  }
  return `http://localhost:${DEV_PORT}/api`;
}

const baseURL = resolveBaseUrl();
// eslint-disable-next-line no-console
console.log('[API] baseURL =', baseURL);

const api = axios.create({ baseURL, timeout: 30000 });

// Tự động gắn JWT vào mỗi request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý 401 → xóa storage + reset state qua custom event (App sẽ lắng nghe để redirect về Login)
// Dùng chung 1 lần refresh khi nhiều request cùng bị 401 (refresh token bị xoay vòng, chỉ dùng được 1 lần)
let refreshing = null;

async function refreshAccessToken() {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('Không có refresh token');
  // axios trần để không đi qua interceptor của `api`
  const res = await axios.post(`${baseURL}/auth/refresh-token`, { refreshToken }, { timeout: 30000 });
  const data = res.data.data;
  await AsyncStorage.multiSet([
    ['accessToken', data.accessToken],
    ['refreshToken', data.refreshToken],
  ]);
  return data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      // Access token hết hạn (15 phút) → thử đổi refresh token lấy token mới rồi gọi lại request
      original._retried = true;
      try {
        refreshing = refreshing || refreshAccessToken().finally(() => { refreshing = null; });
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // refresh cũng hỏng (hết hạn/bị thu hồi) → đăng xuất
      }
    }
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      DeviceEventEmitter.emit('rideup-auth-expired');
    }
    return Promise.reject(error);
  }
);

export default api;

// ===== Auth =====
export const login = (email, password) =>
  api.post('/auth/authentication', { email, password }).then((r) => r.data.data);

export const registerCustomer = (fullName, email, phone, password) =>
  api.post('/auth/register', { fullName, email, phone, password, role: 'CUSTOMER' }).then((r) => r.data.data);

export const logoutCall = (accessToken, refreshToken) =>
  api.post('/auth/logout', { accessToken, refreshToken }).then((r) => r.data);

// ===== Locations (public) =====
export const listProvinces = (keyword) =>
  api.get('/locations/provinces', { params: keyword ? { keyword } : {} }).then((r) => r.data.data);

export const listWards = (provinceId, keyword) =>
  api.get('/locations/wards', {
    params: { ...(provinceId ? { provinceId } : {}), ...(keyword ? { keyword } : {}) },
  }).then((r) => r.data.data);

export const getWardById = (id) =>
  api.get(`/locations/wards/${id}`).then((r) => r.data.data);

// ===== Trips (search) =====
export const searchTrips = (body) =>
  api.post('/trips/search', body).then((r) => r.data.data);

export const searchTripsRanked = (body) =>
  api.post('/trips/search-ranking', body).then((r) => r.data.data);

// ===== Bookings (customer) =====
export const createBooking = (form) =>
  api.post('/customer/bookings', form).then((r) => r.data);

export const listMyBookings = () =>
  api.get('/customer/bookings/mine').then((r) => r.data.data);

export const cancelBooking = (id, reason) =>
  api.delete(`/customer/bookings/${id}`, { params: { reason } }).then((r) => r.data);

/** Gọi SAU khi Stripe PaymentSheet success — backend verify với Stripe rồi flip Payment.status PENDING → HOLDING. */
export const authorizePayment = ({ paymentId, transactionId }) =>
  api.post(`/payments/${paymentId}/authorize`, { transactionId }).then((r) => r.data);

/** Tạo Stripe PaymentIntent cho booking hiện có — gọi khi user bấm "Thanh toán ngay". */
export const createPaymentIntent = (bookingId) =>
  api.post('/payments/create-intent', { bookingId }).then((r) => r.data.data);

// ===== Profile (self) =====
export const getMyProfile = () =>
  api.get('/users/me').then((r) => r.data.data);

export const updateMyProfile = (body) =>
  api.patch('/users/me', body).then((r) => r.data.data);

export const changePassword = (body) =>
  api.post('/users/me/change-password', body).then((r) => r.data);

/** Upload avatar — file là object do expo-image-picker trả về: { uri, name, type } hoặc { uri, mimeType, fileName } Kết quả trả về UserResponse đã... */
export const uploadAvatar = (file) => {
  const fd = new FormData();
  const name = file.name || file.fileName || 'avatar.jpg';
  const type = file.type || file.mimeType || 'image/jpeg';
  fd.append('avatar', { uri: file.uri, name, type });
  return api
    .post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.data);
};