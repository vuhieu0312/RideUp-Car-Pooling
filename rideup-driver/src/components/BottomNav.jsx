import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, CarFront, Home, MessageCircle, UserRound } from 'lucide-react'

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function tab(path) {
    return path === '/driver' ? pathname === path : pathname.startsWith(path)
  }

  return (
    <nav className="driver-bottom-nav" aria-label="Điều hướng chính">
      <NavItem icon={Home} label="Trang chủ" active={tab('/driver')} onClick={() => navigate('/driver')} />
      <NavItem icon={CarFront} label="Chuyến xe" active={tab('/driver/trips')} onClick={() => navigate('/driver/trips')} />
      <NavItem icon={MessageCircle} label="Tin nhắn" />
      <NavItem icon={Bell} label="Thông báo" />
      <NavItem icon={UserRound} label="Tài khoản" />
    </nav>
  )
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button type="button" className={`driver-bottom-item${active ? ' active' : ''}`} onClick={onClick}>
      <Icon className="driver-nav-icon" size={21} strokeWidth={1.8} />
      <small>{label}</small>
    </button>
  )
}
