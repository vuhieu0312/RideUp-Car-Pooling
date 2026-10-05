import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { listMyTrips, listProvinces } from '../api/api'

const FILTERS = [
  { id: 'ALL', label: 'Tất cả', tone: '#16a34a' },
  { id: 'OPEN', label: 'Đã lên lịch', tone: '#3b82f6' },
  { id: 'STARTED', label: 'Đang chạy', tone: '#16a34a' },
  { id: 'COMPLETED', label: 'Đã chạy', tone: '#6b7280' },
  { id: 'CANCELED', label: 'Đã hủy', tone: '#dc2626' },
]

export default function AllTripsPage() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [provinces, setProvinces] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  function loadTrips() {
    setLoading(true)
    Promise.all([listMyTrips(), listProvinces()])
      .then(([tripData, provinceData]) => {
        setTrips(tripData)
        setProvinces(provinceData)
      })
      .catch(() => setNotice('Không tải được danh sách chuyến xe'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const visibleTrips = useMemo(() => {
    if (filter === 'ALL') return trips
    if (filter === 'OPEN') return trips.filter((trip) => trip.status === 'OPEN' || trip.status === 'FULL')
    return trips.filter((trip) => trip.status === filter)
  }, [filter, trips])

  function provinceName(id) {
    return provinces.find((province) => province.id === id)?.name || id || '?'
  }

  return (
    <div className="driver-mobile-page">
      <header className="driver-list-header">
        <button className="driver-back-button" onClick={() => navigate('/driver')} aria-label="Quay lại">‹</button>
        <div>
          <div className="driver-header-kicker">TÀI XẾ</div>
          <h1>Tất cả chuyến xe</h1>
        </div>
        <button className="driver-refresh-button" onClick={loadTrips} aria-label="Làm mới">↻</button>
      </header>

      <main className="driver-list-content">
        <button className="driver-create-button" onClick={() => navigate('/driver/trips/new')}>✣&nbsp; Tạo chuyến mới</button>

        <div className="trip-filter-bar" role="tablist" aria-label="Lọc trạng thái chuyến">
          {FILTERS.map((item) => {
            const count = item.id === 'ALL'
              ? trips.length
              : item.id === 'OPEN'
                ? trips.filter((trip) => trip.status === 'OPEN' || trip.status === 'FULL').length
                : trips.filter((trip) => trip.status === item.id).length
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={filter === item.id}
                className={`trip-filter${filter === item.id ? ' active' : ''}`}
                style={{ '--filter-color': item.tone }}
                onClick={() => setFilter(item.id)}
              >
                <span className="filter-dot" />{item.label}<b>{count}</b>
              </button>
            )
          })}
        </div>

        {notice && <div className="driver-notice">{notice}</div>}
        {loading ? (
          <div className="driver-empty-state">Đang tải chuyến xe...</div>
        ) : visibleTrips.length === 0 ? (
          <div className="driver-empty-state">
            <div className="driver-empty-icon">□</div>
            <strong>Chưa có chuyến xe</strong>
            <span>Những chuyến theo bộ lọc sẽ xuất hiện ở đây.</span>
          </div>
        ) : (
          <div className="driver-trip-list">
            {visibleTrips.map((trip) => (
              <DriverTripCard
                key={trip.id}
                trip={trip}
                provinceName={provinceName}
                onAction={(message) => setNotice(message)}
              />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}

function DriverTripCard({ trip, provinceName, onAction }) {
  const booked = Math.max(0, (trip.seatTotal || 0) - (trip.seatAvailable || 0))
  const progress = trip.seatTotal ? Math.min(100, (booked / trip.seatTotal) * 100) : 0
  const status = getStatus(trip.status)
  const revenue = (trip.priceVnd || 0) * booked

  return (
    <article className="driver-trip-card">
      <div className="driver-trip-card-top">
        <div>
          <h2>{provinceName(trip.startProvinceId)} → {provinceName(trip.endProvinceId)}</h2>
          <div className="driver-trip-time">▣ {formatDate(trip.departureTime)} &nbsp; ◷ {formatTime(trip.departureTime)}</div>
        </div>
        <span className={`trip-status ${status.className}`}>{status.label}</span>
      </div>
      <div className="driver-seat-line"><span>Ghế đã đặt</span><b>{booked}/{trip.seatTotal || 0}</b></div>
      <div className="driver-seat-track"><span style={{ width: `${progress}%` }} /></div>
      <div className="driver-trip-summary">
        <div><small>Doanh thu</small><strong>{formatMoney(revenue)}</strong></div>
        <div><small>Giá vé</small><strong>{formatMoney(trip.priceVnd)}/ghế</strong></div>
      </div>
      <div className="driver-trip-actions">
        {(trip.status === 'OPEN' || trip.status === 'FULL') && <button className="start-action" onClick={() => onAction('Chức năng bắt đầu chuyến chưa có API backend.')}>Bắt đầu</button>}
        {(trip.status === 'OPEN' || trip.status === 'FULL') && <button className="cancel-action" onClick={() => onAction('Chức năng hủy chuyến chưa có API backend.')}>Hủy</button>}
        <button className="detail-action" onClick={() => onAction('Chức năng xem chi tiết chưa có API backend.')}>Chi tiết</button>
      </div>
    </article>
  )
}

function getStatus(status) {
  const statuses = {
    OPEN: { label: 'Đã lên lịch', className: 'scheduled' },
    FULL: { label: 'Đã lên lịch', className: 'scheduled' },
    STARTED: { label: 'Đang chạy', className: 'running' },
    COMPLETED: { label: 'Đã chạy', className: 'completed' },
    CANCELED: { label: 'Đã hủy', className: 'canceled' },
  }
  return statuses[status] || { label: status, className: 'completed' }
}

function formatDate(value) {
  if (!value) return '--/--/----'
  return new Date(value).toLocaleDateString('vi-VN')
}

function formatTime(value) {
  if (!value) return '--:--'
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatMoney(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`
}
