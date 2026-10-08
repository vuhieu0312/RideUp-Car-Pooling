import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
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