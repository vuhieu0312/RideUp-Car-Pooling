import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api

// ===== Auth =====
export const login = (email, password) =>
  api.post('/auth/authentication', { email, password }).then((r) => r.data.data)

export const logoutCall = (accessToken, refreshToken) =>
  api.post('/auth/logout', { accessToken, refreshToken }).then((r) => r.data)

// ===== Admin =====
export const listDrivers = (status) =>
  api.get(`/admin/drivers${status ? `?status=${status}` : ''}`).then((r) => r.data.data)

export const approveDriver = (id) =>
  api.post(`/admin/drivers/${id}/approve`).then((r) => r.data)

export const rejectDriver = (id, reason) =>
  api.post(`/admin/drivers/${id}/reject`, { reason }).then((r) => r.data)

export const listPendingVehicles = () =>
  api.get('/admin/vehicles/pending').then((r) => r.data.data)

export const approveVehicle = (id) =>
  api.post(`/admin/vehicles/${id}/approve`).then((r) => r.data)

export const rejectVehicle = (id, reason) =>
  api.post(`/admin/vehicles/${id}/reject`, { reason }).then((r) => r.data)

export const getLocationStats = () =>
  api.get('/admin/locations/stats').then((r) => r.data.data)