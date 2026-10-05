import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { doLogin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await doLogin(email, password)
      // Chỉ cho role DRIVER. Không tiết lộ role cho attacker — luôn báo "sai thông tin đăng nhập".
      if (!user.roles?.includes('DRIVER')) {
        throw new Error('Email hoặc mật khẩu không đúng')
      }
      navigate('/driver')
    } catch (e) {
      setError('Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page driver-auth-page">
      <section className="auth-hero">
        <div className="auth-brand">RIDEUP · TÀI XẾ</div>
        <h1>Chủ động hành trình,<br />tăng thêm thu nhập.</h1>
        <p>Quản lý chuyến xe dễ dàng, kết nối hành khách đúng lúc.</p>
      </section>
      <section className="auth-card">
        <div className="auth-card-heading">
          <span className="auth-kicker">TÀI XẾ</span>
          <h2>Chào mừng trở lại</h2>
          <p>Đăng nhập để quản lý những chuyến đi của bạn.</p>
        </div>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={submit}>
        <label className="auth-field">
          <span><Mail size={16} /> Email</span>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="auth-field">
          <span><LockKeyhole size={16} /> Mật khẩu</span>
          <div className="auth-password-wrap">
            <input type={showPassword ? 'text' : 'password'} placeholder="Nhập mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
        </label>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
      <p className="auth-switch">Chưa có tài khoản tài xế? <Link to="/register">Đăng ký tài xế</Link></p>
      </section>
    </main>
  )
}