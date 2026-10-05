import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Navbar({ brand = 'RideUp' }) {
  const { user, doLogout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <Link to="/" className="brand">{brand}</Link>
      {user ? (
        <div className="row">
          {user.roles?.includes('ADMIN') && !user.roles?.includes('DRIVER') && (
            <Link to="/admin"><button className="secondary">Quản trị</button></Link>
          )}
          {user.roles?.includes('DRIVER') && !user.roles?.includes('ADMIN') && (
            <Link to="/driver"><button className="secondary">Trang tài xế</button></Link>
          )}
          <span className="user">
            {user.fullName} ({user.roles?.join(', ')})
          </span>
          <button className="secondary" onClick={() => { doLogout(); navigate('/login') }}>
            Đăng xuất
          </button>
        </div>
      ) : (
        <div className="row">
          <Link to="/login"><button className="secondary">Đăng nhập</button></Link>
          <Link to="/register"><button>Đăng ký tài xế</button></Link>
        </div>
      )}
    </nav>
  )
}