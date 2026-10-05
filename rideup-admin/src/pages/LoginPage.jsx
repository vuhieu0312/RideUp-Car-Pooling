import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@rideup.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      // res = AuthResponse { accessToken, refreshToken, user: { id, fullName, email, roles: [...] }, expiresIn }
      const roles = res.user?.roles || []
      if (!roles.includes('ADMIN')) {
        throw new Error('Email hoặc mật khẩu không đúng')
      }
      localStorage.setItem('adminToken', res.accessToken)
      localStorage.setItem('adminUser', JSON.stringify(res))
      navigate('/dashboard')
    } catch (e) {
      setError('Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>🔐 Đăng nhập Admin</h1>
      <div className="alert info">
        Đăng nhập dành cho <b>quản trị viên</b>. Nếu bạn là khách hàng hoặc tài xế, vui lòng dùng ứng dụng phù hợp.
      </div>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  )
}