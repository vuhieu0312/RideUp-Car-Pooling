import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react'
import { registerCustomer } from '../api/api'
import { useAuth } from '../auth/AuthContext'

export default function RegisterCustomerPage() {
  const { doLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerCustomer(form.fullName, form.email, form.phone, form.password)
      // Tự động đăng nhập luôn
      await doLogin(form.email, form.password)
      navigate('/customer')
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <main className="auth-page customer-auth-page">
      <section className="auth-hero">
        <div className="auth-brand">RIDEUP</div>
        <h1>Bắt đầu hành trình<br />của riêng bạn.</h1>
        <p>Tạo tài khoản để tìm chuyến xe phù hợp hơn mỗi ngày.</p>
      </section>
      <section className="auth-card">
        <div className="auth-card-heading">
          <span className="auth-kicker">KHÁCH HÀNG</span>
          <h2>Tạo tài khoản</h2>
          <p>Điền thông tin để bắt đầu sử dụng RideUp.</p>
        </div>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={submit}>
        <AuthField icon={UserRound} label="Họ và tên"><input value={form.fullName} onChange={update('fullName')} placeholder="Nguyễn Văn A" required /></AuthField>
        <AuthField icon={Mail} label="Email"><input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required /></AuthField>
        <AuthField icon={Phone} label="Số điện thoại"><input value={form.phone} onChange={update('phone')} placeholder="0912345678" required /></AuthField>
        <AuthField icon={LockKeyhole} label="Mật khẩu (tối thiểu 8 ký tự)"><div className="auth-password-wrap"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder="Nhập mật khẩu" required /><button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></AuthField>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>
      <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
      </section>
    </main>
  )
}

function AuthField({ icon: Icon, label, children }) {
  return <label className="auth-field"><span><Icon size={16} /> {label}</span>{children}</label>
}