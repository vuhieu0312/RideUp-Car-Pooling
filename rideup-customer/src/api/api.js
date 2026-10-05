import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Tự động gắn JWT vào mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Xử lý 401 → logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
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

export const registerCustomer = (fullName, email, phone, password) =>
  api
    .post('/auth/register', { fullName, email, phone, password, role: 'CUSTOMER' })
    .then((r) => r.data.data)

export const logoutCall = (accessToken, refreshToken) =>
  api.post('/auth/logout', { accessToken, refreshToken }).then((r) => r.data)

// ===== Driver =====
export const registerDriver = (form, files) => {
  // Multipart submit: form fields + 3 files
  const fd = new FormData()
  const dataBlob = new Blob([JSON.stringify(form)], { type: 'application/json' })
  fd.append('fullName', form.fullName)
  fd.append('email', form.email)
  fd.append('password', form.password)
  fd.append('phone', form.phone)
  fd.append('cccd', form.cccd)
  fd.append('gplx', form.gplx)
  fd.append('gplxExpiryDate', form.gplxExpiryDate)
  fd.append('cccdImageFront', files.cccdImageFront)
  fd.append('cccdImageBack', files.cccdImageBack)
  fd.append('gplxImage', files.gplxImage)
  return api
    .post('/driver/register', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.data)
}

export const getDriverProfile = () =>
  api.get('/driver/me').then((r) => r.data.data)

export const getDriverStatus = () =>
  api.get('/driver/status').then((r) => r.data.data)

// ===== Admin =====
export const listPendingDrivers = () =>
  api.get('/admin/drivers?status=PENDING').then((r) => r.data.data)

export const listDrivers = (status) =>
  api.get(`/admin/drivers${status ? `?status=${status}` : ''}`).then((r) => r.data.data)

export const approveDriver = (id) =>
  api.post(`/admin/drivers/${id}/approve`).then((r) => r.data)

export const rejectDriver = (id, reason) =>
  api.post(`/admin/drivers/${id}/reject`, { reason }).then((r) => r.data)

// ===== Locations (public) =====
export const listProvinces = (keyword) =>
  api
    .get('/locations/provinces', { params: keyword ? { keyword } : {} })
    .then((r) => r.data.data)

export const listWards = (provinceId, keyword) =>
  api
    .get('/locations/wards', {
      params: { ...(provinceId ? { provinceId } : {}), ...(keyword ? { keyword } : {}) },
    })
    .then((r) => r.data.data)

// ===== Trips (search) =====
export const searchTrips = (body) =>
  api.post('/trips/search', body).then((r) => r.data.data)

export const searchTripsRanked = (body) =>
  api.post('/trips/search-ranking', body).then((r) => r.data.data)

// ===== Bookings (customer) =====
export const createBooking = (form) =>
  api.post('/customer/bookings', form).then((r) => r.data)

export const listMyBookings = () =>
  api.get('/customer/bookings/mine').then((r) => r.data.data)

export const cancelBooking = (id, reason) =>
  api.delete(`/customer/bookings/${id}`, { params: { reason } }).then((r) => r.data)