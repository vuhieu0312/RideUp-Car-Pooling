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

const api = axios.create({ baseURL, timeout: 30000 });

console.log('[API] baseURL =', baseURL);

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log('[API] →', config.method?.toUpperCase(), config.url);
  return config;
});

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
  (response) => {
    console.log('[API] ✓', response.config.method?.toUpperCase(), response.config.url, '→', response.status);
    return response;
  },
  async (error) => {
    console.log('[API] ✗', error.config?.method?.toUpperCase(), error.config?.url,
      '→', error.response?.status || error.message);
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

// ===== Driver =====
export const registerDriver = (form, files) => {
  const fd = new FormData();
  fd.append('fullName', form.fullName);
  fd.append('email', form.email);
  fd.append('password', form.password);
  fd.append('phone', form.phone);
  fd.append('cccd', form.cccd);
  fd.append('gplx', form.gplx);
  fd.append('gplxExpiryDate', form.gplxExpiryDate);
  // RN FormData: chỉ cần object {uri, name, type} từ expo-image-picker
  fd.append('cccdImageFront', files.cccdImageFront);
  fd.append('cccdImageBack', files.cccdImageBack);
  fd.append('gplxImage', files.gplxImage);
  return api.post('/driver/register', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.data);
};

export const getDriverProfile = () =>
  api.get('/driver/me').then((r) => r.data.data);

export const getDriverStatus = () =>
  api.get('/driver/status').then((r) => r.data.data);

// ===== Locations (public) =====
export const listProvinces = (keyword) =>
  api.get('/locations/provinces', { params: keyword ? { keyword } : {} }).then((r) => r.data.data);

export const listWards = (provinceId, keyword) =>
  api.get('/locations/wards', {
    params: { ...(provinceId ? { provinceId } : {}), ...(keyword ? { keyword } : {}) },
  }).then((r) => r.data.data);

// ===== Trip =====
export const createTrip = (form) =>
  api.post('/trips', form).then((r) => r.data);

export const listMyTrips = () =>
  api.get('/trips/mine').then((r) => r.data.data);

export const startTrip = (tripId) =>
  api.post(`/trips/${tripId}/start`).then((r) => r.data);

export const completeTrip = (tripId) =>
  api.post(`/trips/${tripId}/complete`).then((r) => r.data);

/** Driver huỷ chuyến — auto-refund tất cả booking STRIPE đang active (HOLDING → PI.cancel, PENDING → VOIDED). */
export const cancelTrip = (tripId, reason) =>
  api.post(`/trips/${tripId}/cancel`, null, { params: { reason } }).then((r) => r.data);

// ===== Bookings (driver) =====
export const listDriverBookings = (status) =>
  api.get('/driver/bookings', { params: status ? { status } : {} }).then((r) => r.data.data);

export const listDriverPendingBookings = () =>
  api.get('/driver/bookings/pending').then((r) => r.data.data);

export const confirmBooking = (bookingId) =>
  api.post(`/driver/bookings/${bookingId}/confirm`).then((r) => r.data);

export const rejectBooking = (bookingId, reason) =>
  api.post(`/driver/bookings/${bookingId}/reject`, null, { params: { reason } }).then((r) => r.data);

export const confirmCashReceived = (bookingId) =>
  api.post(`/driver/bookings/${bookingId}/confirm-cash`).then((r) => r.data);

export const pickupBooking = (bookingId) =>
  api.post(`/driver/bookings/${bookingId}/pickup`).then((r) => r.data);

// ===== Vehicle =====
export const registerVehicle = (form) =>
  api.post('/driver/vehicles', form).then((r) => r.data);

export const listMyVehicles = () =>
  api.get('/driver/vehicles').then((r) => r.data.data);

// ===== Profile (self) =====
export const getMyProfile = () =>
  api.get('/users/me').then((r) => r.data.data);

export const updateMyProfile = (body) =>
  api.patch('/users/me', body).then((r) => r.data.data);

export const changePassword = (body) =>
  api.post('/users/me/change-password', body).then((r) => r.data);

/** Upload avatar — file là object do expo-image-picker trả về. */
export const uploadAvatar = (file) => {
  const fd = new FormData();
  const name = file.name || file.fileName || 'avatar.jpg';
  const type = file.type || file.mimeType || 'image/jpeg';
  fd.append('avatar', { uri: file.uri, name, type });
  return api
    .post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.data);
};