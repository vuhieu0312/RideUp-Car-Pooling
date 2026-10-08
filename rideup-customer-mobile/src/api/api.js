import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

// Lấy base URL từ app.json (extra.apiUrl). Có thể override bằng EXPO_PUBLIC_API_URL khi start.
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

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
api.interceptors.response.use(
  (response) => response,
  async (error) => {
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

// ===== Profile (self) =====
export const getMyProfile = () =>
  api.get('/users/me').then((r) => r.data.data);

export const updateMyProfile = (body) =>
  api.patch('/users/me', body).then((r) => r.data.data);

export const changePassword = (body) =>
  api.post('/users/me/change-password', body).then((r) => r.data);

/**
 * Upload avatar — file là object do expo-image-picker trả về:
 *   { uri, name, type } hoặc { uri, mimeType, fileName }
 * Kết quả trả về UserResponse đã cập nhật avatarUrl.
 */
export const uploadAvatar = (file) => {
  const fd = new FormData();
  const name = file.name || file.fileName || 'avatar.jpg';
  const type = file.type || file.mimeType || 'image/jpeg';
  fd.append('avatar', { uri: file.uri, name, type });
  return api
    .post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.data);
};