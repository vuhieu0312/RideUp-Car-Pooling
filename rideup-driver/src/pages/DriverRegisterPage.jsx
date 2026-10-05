import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileImage, IdCard, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react'
import { registerDriver } from '../api/api'
import { useAuth } from '../auth/AuthContext'

export default function DriverRegisterPage() {
  const navigate = useNavigate()
  const { doLogin } = useAuth()
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '',
    cccd: '', gplx: '', gplxExpiryDate: '',
  })
  const [files, setFiles] = useState({
    cccdImageFront: null, cccdImageBack: null, gplxImage: null,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!files.cccdImageFront || !files.cccdImageBack || !files.gplxImage) {
      setError('Vui lòng chọn đủ 3 ảnh')
      return
    }
    setLoading(true)
    try {
      await registerDriver(form, files)
      // Backend đã issue token + login → vào pending
      navigate('/driver/pending')
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  const u = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const f = (k) => (e) => setFiles({ ...files, [k]: e.target.files[0] })

  return (
    <main className="auth-page driver-auth-page driver-register-page">
      <section className="auth-hero">
        <div className="auth-brand">RIDEUP · TÀI XẾ</div>
        <h1>Cùng RideUp<br />lăn bánh mỗi ngày.</h1>
        <p>Đăng ký hồ sơ, nhận chuyến và chủ động thời gian của bạn.</p>
      </section>
      <section className="auth-card">
        <div className="auth-card-heading">
          <span className="auth-kicker">TÀI XẾ</span>
          <h2>Đăng ký hồ sơ</h2>
          <p>Admin sẽ duyệt hồ sơ trước khi bạn bắt đầu nhận chuyến.</p>
        </div>
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={submit}>
        <AuthSection title="1. Thông tin cá nhân">
          <AuthField icon={UserRound} label="Họ và tên *"><input value={form.fullName} onChange={u('fullName')} required /></AuthField>
          <AuthField icon={Mail} label="Email *"><input type="email" value={form.email} onChange={u('email')} required /></AuthField>
          <AuthField icon={Phone} label="Số điện thoại *"><input value={form.phone} onChange={u('phone')} placeholder="0912345678" required /></AuthField>
          <AuthField icon={LockKeyhole} label="Mật khẩu (≥ 8 ký tự) *"><input type="password" value={form.password} onChange={u('password')} required /></AuthField>
        </AuthSection>
        <AuthSection title="2. Giấy tờ tùy thân">
          <AuthField icon={IdCard} label="Số CCCD (12 số) *"><input value={form.cccd} onChange={u('cccd')} pattern="[0-9]{12}" required /></AuthField>
          <AuthField icon={IdCard} label="Số GPLX *"><input value={form.gplx} onChange={u('gplx')} required /></AuthField>
          <AuthField icon={IdCard} label="Ngày hết hạn GPLX *"><input type="date" value={form.gplxExpiryDate} onChange={u('gplxExpiryDate')} required /></AuthField>
        </AuthSection>
        <AuthSection title="3. Ảnh giấy tờ">
          <FileField icon={FileImage} label="Ảnh CCCD mặt trước *" file={files.cccdImageFront} onChange={f('cccdImageFront')} />
          <FileField icon={FileImage} label="Ảnh CCCD mặt sau *" file={files.cccdImageBack} onChange={f('cccdImageBack')} />
          <FileField icon={FileImage} label="Ảnh GPLX *" file={files.gplxImage} onChange={f('gplxImage')} />
        </AuthSection>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ đăng ký'}
        </button>
      </form>

      <p className="auth-switch">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
      </section>
    </main>
  )
}

function AuthField({ icon: Icon, label, children }) {
  return <label className="auth-field"><span><Icon size={16} /> {label}</span>{children}</label>
}

function AuthSection({ title, children }) {
  return <section className="auth-form-section"><h3>{title}</h3>{children}</section>
}

function FileField({ icon: Icon, label, file, onChange }) {
  return <label className="auth-file-field"><span><Icon size={17} /> {label}</span><input type="file" accept="image/*" onChange={onChange} required />{file && <small>✓ {file.name}</small>}</label>
}