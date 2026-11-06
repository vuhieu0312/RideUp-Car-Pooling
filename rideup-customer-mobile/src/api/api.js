import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { DeviceEventEmitter } from 'react-native';

// tự lấy base URL: web → localhost, native → IP LAN từ hostUri, cuối cùng là env/extra
const DEV_PORT = 8080;

function resolveBaseUrl() {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return `http://localhost:${DEV_PORT}/api`;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${DEV_PORT}/api`;
    }
  }
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

export const resolveMediaUrl = (path) => {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${baseURL}${path}`;
};
// eslint-disable-next-line no-console
if (__DEV__) console.log('[API] baseURL =', baseURL);

const api = axios.create({ baseURL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 thì xoá storage và phát event cho App chuyển về Login
// nhiều request cùng 401 thì dùng chung 1 lần refresh (refresh token xoay vòng, chỉ dùng được 1 lần)
let refreshing = null;

async function refreshAccessToken() {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('Không có refresh token');
  // axios trần để không đi qua interceptor của api
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
      // access token hết hạn thì đổi bằng refresh token rồi gọi lại
      original._retried = true;
      try {
        refreshing = refreshing || refreshAccessToken().finally(() => { refreshing = null; });
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // refresh cũng hỏng thì đăng xuất
      }
    }
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      DeviceEventEmitter.emit('rideup-auth-expired');
    }
    return Promise.reject(error);
  }
);

export const getWsUrl = () => `${baseURL.replace(/^http/, 'ws')}/ws`;

// token còn dưới 30s coi như sắp hết hạn
function isTokenExpiring(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = part + '='.repeat((4 - (part.length % 4)) % 4);
    const { exp } = JSON.parse(atob(padded));
    return !exp || exp * 1000 - Date.now() < 30000;
  } catch {
    return false;
  }
}

// WebSocket không đi qua interceptor 401 nên phải tự refresh token trước khi kết nối
export async function getFreshAccessToken() {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) return null;
  if (!isTokenExpiring(token)) return token;
  try {
    refreshing = refreshing || refreshAccessToken().finally(() => { refreshing = null; });
    return await refreshing;
  } catch {
    return null;
  }
}

export default api;

export const login = (email, password) =>
  api.post('/auth/authentication', { email, password }).then((r) => r.data.data);

export const registerCustomer = (fullName, email, phone, password) =>
  api.post('/auth/register', { fullName, email, phone, password, role: 'CUSTOMER' }).then((r) => r.data.data);

export const listProvinces = (keyword) =>
  api.get('/locations/provinces', { params: keyword ? { keyword } : {} }).then((r) => r.data.data);

export const listWards = (provinceId, keyword) =>
  api.get('/locations/wards', {
    params: { ...(provinceId ? { provinceId } : {}), ...(keyword ? { keyword } : {}) },
  }).then((r) => r.data.data);

export const getWardById = (id) =>
  api.get(`/locations/wards/${id}`).then((r) => r.data.data);

export const searchTrips = (body) =>
  api.post('/trips/search', body).then((r) => r.data.data);

export const createBooking = (form) =>
  api.post('/customer/bookings', form).then((r) => r.data);

export const listMyBookings = () =>
  api.get('/customer/bookings/mine').then((r) => r.data.data);

export const listMyConversations = () =>
  api.get('/customer/conversations').then((r) => r.data.data);

export const getConversationMessages = (conversationId) =>
  api.get(`/messages/${conversationId}`, { params: { page: 0, size: 100 } }).then((r) => r.data.content || []);

export const cancelBooking = (id, reason) =>
  api.delete(`/customer/bookings/${id}`, { params: { reason } }).then((r) => r.data);

export const authorizePayment = ({ paymentId, transactionId }) =>
  api.post(`/payments/${paymentId}/authorize`, { transactionId }).then((r) => r.data);

export const createPaymentIntent = (bookingId) =>
  api.post('/payments/create-intent', { bookingId }).then((r) => r.data.data);

export const getMyProfile = () =>
  api.get('/users/me').then((r) => r.data.data);

export const updateMyProfile = (body) =>
  api.patch('/users/me', body).then((r) => r.data.data);

export const changePassword = (body) =>
  api.post('/users/me/change-password', body).then((r) => r.data);

export const uploadAvatar = (file) => {
  const fd = new FormData();
  const name = file.name || file.fileName || 'avatar.jpg';
  const type = file.type || file.mimeType || 'image/jpeg';
  fd.append('avatar', { uri: file.uri, name, type });
  return api
    .post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.data);
};