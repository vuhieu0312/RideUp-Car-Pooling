import { useNavigate } from 'react-router-dom'

export default function Navbar({ brand, user }) {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="brand">{brand}</div>
      {user && (
        <div className="row">
          <span className="user">
            {user.fullName} ({user.email}) — <b>ADMIN</b>
          </span>
          <button className="secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      )}
    </nav>
  )
}