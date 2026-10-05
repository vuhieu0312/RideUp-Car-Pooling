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
      const user = await login(email, password)
      if (!user.roles?.includes('ADMIN')) {
        throw new Error('Tài khoản không có quyền admin')
      }
      localStorage.setItem('adminToken', user.accessToken || user.accessToken)
      localStorage.setItem('adminUser', JSON.stringify(user))
      navigate('/dashboard')
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>🔐 Đăng nhập Admin</h1>
      <div className="alert info">
        Tài khoản admin mặc định: <b>admin@rideup.com</b> / <b>admin123</b>
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