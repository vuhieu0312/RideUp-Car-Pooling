import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin } from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  // Khi user load từ localStorage, nếu đã có token thì trust (lưu ý: nên verify với backend khi cần)
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token || !user) {
      // optional: gọi /auth/me để verify token còn hạn
    }
  }, [])

  async function doLogin(email, password) {
    const data = await apiLogin(email, password)
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  function doLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  function isDriver() {
    return user?.roles?.includes('DRIVER')
  }
  function isAdmin() {
    return user?.roles?.includes('ADMIN')
  }
  function isCustomer() {
    return user?.roles?.includes('CUSTOMER')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        doLogin,
        doLogout,
        isDriver,
        isAdmin,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)