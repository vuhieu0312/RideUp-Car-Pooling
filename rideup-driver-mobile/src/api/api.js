import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { DeviceEventEmitter, Platform } from 'react-native';

/** Tự detect base URL theo thứ tự ưu tiên — đổi WiFi không cần sửa file */
const DEV_PORT = 8080;

function resolveBaseUrl() {
    // 1. Web (browser) → dùng localhost, browser cùng máy backend
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
        return `http://localhost:${DEV_PORT}/api`;
    }
    // 2. Native (Expo Go qua QR LAN) → lấy IP LAN của máy dev từ hostUri
    const hostUri = Constants.expoConfig && Constants.expoConfig.hostUri;
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
    const extra = Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiUrl;
    if (extra && extra !== `http://localhost:${DEV_PORT}/api`) {
        return extra;
    }
    return `http://localhost:${DEV_PORT}/api`;
}

const baseURL = resolveBaseUrl();

const api = axios.create({ baseURL, timeout: 30000 });

console.log('[API] baseURL =', baseURL);

api.interceptors.request.use(async(config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    console.log('[API] →', config.method && config.method.toUpperCase(), config.url);
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
        console.log('[API] ✓', response.config.method && response.config.method.toUpperCase(), response.config.url, '→', response.status);
        return response;
    },
    async(error) => {
        console.log('[API] ✗', error.config && error.config.method && error.config.method.toUpperCase(), error.config && error.config.url,
            '→', error.response && error.response.status || error.message);
        const original = error.config;
        const isAuthCall = original && original.url && original.url.includes('/auth/');
        if (error.response && error.response.status === 401 && original && !original._retried && !isAuthCall) {
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
        if (error.response && error.response.status === 401) {
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            DeviceEventEmitter.emit('rideup-auth-expired');
        }
        return Promise.reject(error);
    }
);

/** URL WebSocket cho realtime: http(s)://host/api → ws(s)://host/api/ws */
export const getWsUrl = () => `${baseURL.replace(/^http/, 'ws')}/ws`;

/** JWT còn hạn ít hơn 30 giây (hoặc không đọc được exp) → coi như sắp hết hạn. */
function isTokenExpiring(token) {
    try {
        const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = part + '='.repeat((4 - (part.length % 4)) % 4);
        const { exp } = JSON.parse(atob(padded));
        return !exp || exp * 1000 - Date.now() < 30000;
    } catch {
        return false; // không decode được → cứ dùng token hiện có
    }
}

/**
 * Access token còn hạn cho WebSocket. WebSocket không đi qua interceptor 401 của axios,
 * nên phải tự refresh trước khi kết nối (token chỉ sống 15 phút). Trả null nếu chưa đăng nhập / refresh hỏng.
 */
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

// ===== Auth =====
export const login = (email, password) =>
    api.post('/auth/authentication', { email, password }).then((r) => r.data.data);

const appendFile = async(fd, key, file, fallbackName = `${key}.jpg`) => {
    const name = file.name || file.fileName || fallbackName;
    const type = file.type || file.mimeType || 'image/jpeg';
    if (Platform.OS === 'web') {
        const blob = await (await fetch(file.uri)).blob();
        fd.append(key, new File([blob], name, { type: blob.type || type }));
    } else {
        fd.append(key, { uri: file.uri, name, type });
    }
};

// ===== Driver =====
export const registerDriver = async(form, files) => {
    const fd = new FormData();
    fd.append('fullName', form.fullName);
    fd.append('email', form.email);
    fd.append('password', form.password);
    fd.append('phone', form.phone);
    fd.append('cccd', form.cccd);
    fd.append('gplx', form.gplx);
    fd.append('gplxExpiryDate', form.gplxExpiryDate);
    await appendFile(fd, 'cccdImageFront', files.cccdImageFront);
    await appendFile(fd, 'cccdImageBack', files.cccdImageBack);
    await appendFile(fd, 'gplxImage', files.gplxImage);
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
        params: {...(provinceId ? { provinceId } : {}), ...(keyword ? { keyword } : {}) },
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

export const listMyConversations = () =>
    api.get('/driver/conversations').then((r) => r.data.data);

export const getConversationMessages = (conversationId) =>
    api.get(`/messages/${conversationId}`, { params: { page: 0, size: 100 } }).then((r) => r.data.content || []);

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
export const uploadAvatar = async(file) => {
    const fd = new FormData();
    await appendFile(fd, 'avatar', file, 'avatar.jpg');
    return api
        .post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then((r) => r.data.data);
};
// ===== Ví / rút tiền (Stripe Connect) =====
export const getPayoutSummary = () =>
    api.get('/driver/payout/summary').then((r) => r.data.data);

export const startPayoutOnboarding = () =>
    api.post('/driver/payout/onboarding').then((r) => r.data.data);

export const withdrawPayout = () =>
    api.post('/driver/payout/withdraw').then((r) => r.data.data);

export const getEarningsStats = () =>
    api.get('/driver/payout/stats').then((r) => r.data.data);