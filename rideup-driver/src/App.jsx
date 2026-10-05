import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './pages/LoginPage'
import DriverRegisterPage from './pages/DriverRegisterPage'
import DriverStatusPage from './pages/DriverStatusPage'
import DriverHomePage from './pages/DriverHomePage'
import AllTripsPage from './pages/AllTripsPage'
import TripCreatePage from './pages/TripCreatePage'
import VehicleRegisterPage from './pages/VehicleRegisterPage'
import VehicleListPage from './pages/VehicleListPage'
import Navbar from './components/Navbar'

function HomeRedirect() {
  const { user } = useAuth()
  if (user?.roles?.includes('ADMIN')) return <Navigate to="/admin" replace />
  if (user?.roles?.includes('DRIVER')) return <Navigate to="/driver" replace />
  return <Navigate to="/login" replace />
}

function RequireRole({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!user.roles?.some((r) => roles.includes(r))) {
    return (
      <div className="container">
        <div className="alert error">
          Tài khoản không có quyền truy cập. Vui lòng dùng <b>RideUp Customer</b> app.
        </div>
      </div>
    )
  }
  return children
}

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { pathname } = useLocation()
  const isMobileDriverPage = pathname === '/driver' || pathname.startsWith('/driver/trips')
  const isAuthPage = pathname === '/login' || pathname === '/register'

  return (
    <>
      {!isMobileDriverPage && !isAuthPage && <Navbar brand="RideUp - Tài xế" />}
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/register"
          element={
            <DriverRegisterPage />
          }
        />

        <Route
          path="/driver"
          element={
            <RequireRole roles={['DRIVER']}>
              <DriverHomePage />
            </RequireRole>
          }
        />
        <Route
          path="/driver/pending"
          element={
            <RequireRole roles={['DRIVER']}>
              <DriverStatusPage />
            </RequireRole>
          }
        />
        <Route
          path="/driver/trips/new"
          element={
            <RequireRole roles={['DRIVER']}>
              <TripCreatePage />
            </RequireRole>
          }
        />
        <Route
          path="/driver/trips"
          element={
            <RequireRole roles={['DRIVER']}>
              <AllTripsPage />
            </RequireRole>
          }
        />
        <Route
          path="/driver/vehicles/new"
          element={
            <RequireRole roles={['DRIVER']}>
              <VehicleRegisterPage />
            </RequireRole>
          }
        />
        <Route
          path="/driver/vehicles"
          element={
            <RequireRole roles={['DRIVER']}>
              <VehicleListPage />
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}