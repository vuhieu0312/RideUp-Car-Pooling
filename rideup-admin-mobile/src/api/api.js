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

/** Ghép đường dẫn ảnh (/uploads/...) với địa chỉ server (đã gồm /api). */
export const fileUrl = (path) => {
  if (!path) return '';
  return /^https?:/.test(path) ? path : `${baseURL}${path}`;
};

const api = axios.create({ baseURL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['adminToken', 'adminUser']);
      DeviceEventEmitter.emit('rideup-auth-expired');
    }
    return Promise.reject(error);
  }
);

export default api;

export const login = (email, password) =>
  api.post('/auth/authentication', { email, password }).then((r) => r.data.data);

export const listDrivers = (status) =>
  api.get(`/admin/drivers${status ? `?status=${status}` : ''}`).then((r) => r.data.data);

export const approveDriver = (id) =>
  api.post(`/admin/drivers/${id}/approve`).then((r) => r.data);

export const rejectDriver = (id, reason) =>
  api.post(`/admin/drivers/${id}/reject`, { reason }).then((r) => r.data);

export const listPendingVehicles = () =>
  api.get('/admin/vehicles/pending').then((r) => r.data.data);

export const approveVehicle = (id) =>
  api.post(`/admin/vehicles/${id}/approve`).then((r) => r.data);

export const rejectVehicle = (id, reason) =>
  api.post(`/admin/vehicles/${id}/reject`, { reason }).then((r) => r.data);

export const getLocationStats = () =>
  api.get('/admin/locations/stats').then((r) => r.data.data);