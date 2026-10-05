import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

const api = axios.create({ baseURL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
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

// ===== Vehicle =====
export const registerVehicle = (form) =>
  api.post('/driver/vehicles', form).then((r) => r.data);

export const listMyVehicles = () =>
  api.get('/driver/vehicles').then((r) => r.data.data);