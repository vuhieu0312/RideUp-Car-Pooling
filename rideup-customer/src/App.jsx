import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterCustomerPage from './pages/RegisterCustomerPage'
import CustomerHomePage from './pages/CustomerHomePage'
import TripSearchPage from './pages/TripSearchPage'
import BookingCreatePage from './pages/BookingCreatePage'
import MyBookingsPage from './pages/MyBookingsPage'
import Navbar from './components/Navbar'

function HomeRedirect() {
  const { user } = useAuth()
  if (user?.roles?.includes('CUSTOMER')) return <Navigate to="/home" replace />
  return <Navigate to="/login" replace />
}

function RequireCustomer({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!user.roles?.includes('CUSTOMER')) {
    return (
      <div className="container">
        <div className="alert error">
          Tài khoản này không phải khách hàng. Vui lòng dùng <b>RideUp Driver</b> app.
        </div>
      </div>
    )
  }
  return children
}

export default function App() {
  const location = useLocation()
  const isCustomerAppPage = location.pathname === '/home' || location.pathname.startsWith('/customer/')
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  return (
    <>
      {!isCustomerAppPage && !isAuthPage && <Navbar brand="RideUp - Khách hàng" />}
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterCustomerPage />} />
        <Route
          path="/home"
          element={
            <RequireCustomer>
              <CustomerHomePage />
            </RequireCustomer>
          }
        />
        <Route
          path="/customer/search"
          element={
            <RequireCustomer>
              <TripSearchPage />
            </RequireCustomer>
          }
        />
        <Route
          path="/customer/book"
          element={
            <RequireCustomer>
              <BookingCreatePage />
            </RequireCustomer>
          }
        />
        <Route
          path="/customer/bookings"
          element={
            <RequireCustomer>
              <MyBookingsPage />
            </RequireCustomer>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}