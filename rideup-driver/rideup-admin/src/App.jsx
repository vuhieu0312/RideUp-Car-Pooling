import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import Navbar from './components/Navbar'

function RequireAdmin({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminUser') || 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user, navigate])

  if (!user) return null
  return children
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminUser') || 'null')
    } catch {
      return null
    }
  })

  return (
    <>
      {user && <Navbar brand="RideUp - Admin" user={user} />}
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setUser} />} />
        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <DashboardPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  )
}