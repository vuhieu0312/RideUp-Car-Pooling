import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { DeviceEventEmitter } from 'react-native';

// tự lấy base URL: web → localhost, native → IP LAN từ hostUri, cuối cùng là env/extra
const DEV_PORT = 8080;

function resolveBaseUrl() {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return `http://${window.location.hostname || 'localhost'}:${DEV_PORT}/api`;
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

export const getWsUrl = () => `${baseURL.replace(/^http/, 'ws')}/ws`;

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

let refreshing = null;

async function refreshAccessToken() {
  let refreshToken = await AsyncStorage.getItem('adminRefreshToken');
  if (!refreshToken) {
    const raw = await AsyncStorage.getItem('adminUser');
    refreshToken = raw ? JSON.parse(raw).refreshToken : null;
  }
  if (!refreshToken) throw new Error('Không có refresh token');
  const res = await axios.post(`${baseURL}/auth/refresh-token`, { refreshToken }, { timeout: 30000 });
  const data = res.data.data;
  await AsyncStorage.multiSet([
    ['adminToken', data.accessToken],
    ['adminRefreshToken', data.refreshToken],
  ]);
  return data.accessToken;
}

export async function getFreshAccessToken() {
  const token = await AsyncStorage.getItem('adminToken');
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

export const listDrivers = (status) =>
  api.get(`/admin/drivers${status ? `?status=${status}` : ''}`).then((r) => r.data.data);

export const getDriverDetail = (id) =>
  api.get(`/admin/drivers/${id}`).then((r) => r.data.data);

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