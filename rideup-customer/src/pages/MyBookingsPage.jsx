import { useEffect, useState } from 'react'
import { Bell, CarFront, Home, MessageCircle, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cancelBooking, listMyBookings } from '../api/api'

export default function MyBookingsPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [filter, setFilter] = useState('ALL')

  function load() {
    setLoading(true)
    listMyBookings()
      .then(setBookings)
      .catch((e) => setError(e.response?.data?.message || 'Lỗi tải booking'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function fmtMoney(v) {
    return new Intl.NumberFormat('vi-VN').format(v) + ' đ'
  }

  function fmtDateTime(iso) {
    return iso ? iso.replace('T', ' ').substring(0, 16) : ''
  }

  function badge(status) {
    const map = {
      PENDING: { class: 'pending', label: '⏳ Chờ tài xế duyệt' },
      CONFIRMED: { class: 'approved', label: '✅ Đã xác nhận' },
      COMPLETED: { class: 'approved', label: '✔️ Hoàn thành' },
      CANCELLED_USER: { class: 'rejected', label: '✖️ Đã huỷ' },
      CANCELLED_PAYMENT_FAILED: { class: 'rejected', label: '✖️ Huỷ (thanh toán lỗi)' },
      EXPIRED: { class: 'rejected', label: '⌛ Hết hạn' },
    }
    return map[status] || { class: 'pending', label: status }
  }

  function matchesFilter(booking) {
    if (filter === 'ALL') return true
    if (filter === 'ACTIVE') return booking.status === 'PENDING' || booking.status === 'CONFIRMED'
    if (filter === 'COMPLETED') return booking.status === 'COMPLETED'
    return booking.status === 'CANCELLED_USER'
      || booking.status === 'CANCELLED_PAYMENT_FAILED'
      || booking.status === 'EXPIRED'
  }

  const visibleBookings = bookings.filter(matchesFilter)
  const canceledCount = bookings.filter((booking) => (
    booking.status === 'CANCELLED_USER'
      || booking.status === 'CANCELLED_PAYMENT_FAILED'
      || booking.status === 'EXPIRED'
  )).length

  async function onCancel(b) {
    if (b.status !== 'PENDING' && b.status !== 'CONFIRMED') return
    const reason = prompt('Lý do huỷ (optional):')
    if (reason === null) return // user cancelled
    try {
      const r = await cancelBooking(b.id, reason || 'Không có lý do')
      setActionMsg(`✅ ${r.message || 'Đã huỷ booking'}`)
      load()
    } catch (e) {
      setActionMsg(`❌ ${e.response?.data?.message || 'Lỗi huỷ'}`)
    }
  }

  return (
    <div className="customer-bookings-page">
      <div className="customer-page-heading">
        <div>
          <small>RIDEUP</small>
          <h1>Chuyến xe của tôi</h1>
        </div>
        <button type="button" onClick={load} aria-label="Làm mới">↻</button>
      </div>

      <div className="customer-booking-filters" role="tablist" aria-label="Lọc chuyến xe">
        <FilterButton label="Tất cả" count={bookings.length} active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
        <FilterButton label="Đang đặt" count={bookings.filter((booking) => booking.status === 'PENDING' || booking.status === 'CONFIRMED').length} active={filter === 'ACTIVE'} onClick={() => setFilter('ACTIVE')} />
        <FilterButton label="Đã xong" count={bookings.filter((booking) => booking.status === 'COMPLETED').length} active={filter === 'COMPLETED'} onClick={() => setFilter('COMPLETED')} />
        <FilterButton label="Đã hủy" count={canceledCount} active={filter === 'CANCELED'} onClick={() => setFilter('CANCELED')} />
      </div>

      {error && <div className="alert error">{error}</div>}
      {actionMsg && <div className="alert info">{actionMsg}</div>}

      {loading ? (
        <p>Đang tải...</p>
      ) : bookings.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>
          Bạn chưa có booking nào.{' '}
          <button onClick={() => (window.location.href = '/customer/search')}>
            Tìm chuyến ngay
          </button>
        </p>
      ) : visibleBookings.length === 0 ? (
        <div className="customer-bookings-empty">Không có chuyến xe trong nhóm này.</div>
      ) : (
        visibleBookings.map((b) => {
          const bdg = badge(b.status)
          const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED'
          return (
            <div key={b.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Mã: <b>{b.bookingCode}</b>
                  </div>
                  <h3 style={{ marginTop: 4 }}>🚌 Khởi hành: {fmtDateTime(b.tripDeparture)}</h3>
                  {b.tripPlate && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Xe: {b.tripPlate}</div>
                  )}
                </div>
                <span className={`badge ${bdg.class}`}>{bdg.label}</span>
              </div>

              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

              <div className="row" style={{ gap: 24, fontSize: 14 }}>
                <div>
                  <div style={{ color: '#6b7280' }}>Số ghế</div>
                  <div style={{ fontWeight: 600 }}>{b.seatCount}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280' }}>Tổng tiền</div>
                  <div style={{ fontWeight: 600, color: '#16a34a' }}>
                    {fmtMoney(b.totalAmount)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#6b7280' }}>Thanh toán</div>
                  <div style={{ fontWeight: 600 }}>{b.paymentStatus}</div>
                </div>
              </div>

              {b.cancelReason && (
                <p style={{ fontSize: 13, color: '#991b1b', marginTop: 8 }}>
                  Lý do: {b.cancelReason}
                </p>
              )}

              {canCancel && (
                <div className="row-end" style={{ marginTop: 12 }}>
                  <button className="danger" onClick={() => onCancel(b)}>
                    Huỷ booking
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}
      <CustomerBottomNav navigate={navigate} />
    </div>
  )
}

function FilterButton({ label, count, active, onClick }) {
  return <button type="button" className={`customer-booking-filter${active ? ' active' : ''}`} onClick={onClick}>{label} <b>{count}</b></button>
}

function CustomerBottomNav({ navigate }) {
  return (
    <nav className="customer-bottom-nav" aria-label="Điều hướng chính">
      <NavItem icon={Home} label="Trang chủ" onClick={() => navigate('/home')} />
      <NavItem icon={CarFront} label="Chuyến xe" active />
      <NavItem icon={MessageCircle} label="Tin nhắn" />
      <NavItem icon={Bell} label="Thông báo" />
      <NavItem icon={UserRound} label="Tài khoản" />
    </nav>
  )
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return <button type="button" className={`bottom-item${active ? ' active' : ''}`} onClick={onClick}><Icon className="customer-nav-icon" size={21} strokeWidth={1.8} /><small>{label}</small></button>
}