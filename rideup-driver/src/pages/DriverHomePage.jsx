import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock3, LogOut, MapPin, Navigation, UsersRound } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import BottomNav from '../components/BottomNav'
import { listMyTrips, listProvinces } from '../api/api'

export default function DriverHomePage() {
  const { user, doLogout } = useAuth()
  const navigate = useNavigate()

  const [trips, setTrips] = useState([])
  const [provinces, setProvinces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyTrips()
      .then(setTrips)
    .catch((e) => console.error('Load trips error:', e))
    .finally(() => setLoading(false))
    listProvinces()
      .then(setProvinces)
      .catch((e) => console.error('Load provinces error:', e))
  }, [])

  const runningTrips = trips.filter((t) => t.status === 'STARTED')
  const scheduledTrips = trips.filter((t) => t.status === 'OPEN' || t.status === 'FULL')

  function logout() {
    doLogout()
    navigate('/login')
  }

  function fmtTime(iso) {
    if (!iso) return ''
    return iso.replace('T', ' ').substring(0, 16)
  }

  function provinceName(id) {
    return provinces.find((province) => province.id === id)?.name || id || '?'
  }

  return (
    <div className="driver-mobile-page" style={{ paddingBottom: 80 }}>
      <div className="driver-home-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="driver-hero-brand">RIDEUP</div>
            <div className="driver-hero-greeting">Xin chào, {user?.fullName || 'tài xế'} <span>👋</span></div>
          </div>
          <button onClick={logout} aria-label="Đăng xuất" className="driver-hero-logout"><LogOut size={17} /></button>
        </div>
      </div>

      <div className="driver-home-stats" style={{ display: 'flex', gap: 12, padding: '0 16px', marginTop: -40 }}>
        <StatBox label="Tổng chuyến" value={trips.length} />
        <StatBox label="Đánh giá" value={4.8} unit="★" color="#facc15" />
        <StatBox label="Doanh thu" value="120K" />
      </div>

      <div style={{ padding: '20px 16px 0 16px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="driver-create-button" onClick={() => navigate('/driver/trips/new')}>✣&nbsp; Tạo chuyến mới</button>
          <button className="driver-all-button" onClick={() => navigate('/driver/trips')}>Xem tất cả</button>
        </div>
      </div>

      <Section title="Chuyến đang thực hiện">
        {loading ? null : runningTrips.length === 0 ? (
          <TripEmpty text="Không có chuyến đang chạy" />
        ) : runningTrips.map((t) => <TripCard key={t.id} trip={t} fmtTime={fmtTime} provinceName={provinceName} running />)}
      </Section>

      <Section title={`Chuyến đã lên lịch (${scheduledTrips.length})`}>
        {loading ? null : scheduledTrips.length === 0 ? (
          <TripEmpty text="Chưa có chuyến nào" />
        ) : scheduledTrips.map((t) => <TripCard key={t.id} trip={t} fmtTime={fmtTime} provinceName={provinceName} />)}
      </Section>

      <BottomNav />
    </div>
  )
}

function StatBox({ label, value, unit, color }) {
  return (
    <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: '14px 8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#111' }}>
        {value}
        {unit && <span style={{ marginLeft: 4, fontSize: 16 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ margin: '20px 16px 0' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  )
}

function TripCard({ trip, fmtTime, provinceName, running }) {
  const status = running ? 'Đang chạy' : 'Đã lên lịch'
  const booked = (trip.seatTotal || 0) - (trip.seatAvailable || 0)
  return (
    <div className={`driver-home-trip-card${running ? ' running' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="driver-home-trip-status">
          {status}
        </span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{booked}/{trip.seatTotal || 0} ghế</span>
      </div>
      <div className="driver-home-trip-route">
        <MapPin size={16} /> <span>{provinceName(trip.startProvinceId)}</span><Navigation size={14} /><span>{provinceName(trip.endProvinceId)}</span>
      </div>
      <div className="driver-home-trip-time">
        <Clock3 size={13} /> {fmtTime(trip.departureTime)}
      </div>
      {running ? (
        <button style={{ width: '100%', marginTop: 10, padding: 8, background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          Xem chi tiết
        </button>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span className="driver-home-trip-passengers"><UsersRound size={13} /> {booked} hành khách</span>
          <span style={{ fontWeight: 600, color: booked > 0 ? '#16a34a' : '#9ca3af' }}>
            {booked > 0 ? new Intl.NumberFormat('vi-VN').format(trip.priceVnd * booked) + 'đ' : '0đ'}
          </span>
        </div>
      )}
    </div>
  )
}

function TripEmpty({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: 20, background: 'white', borderRadius: 8, color: '#9ca3af', fontSize: 13 }}>
      {text}
    </div>
  )
}
