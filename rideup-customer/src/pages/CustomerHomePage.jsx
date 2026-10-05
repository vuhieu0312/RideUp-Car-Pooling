import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CarFront, Home, LogOut, MessageCircle, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { listProvinces, listWards, searchTrips as searchTripsApi } from '../api/api'

export default function CustomerHomePage() {
  const { user, doLogout } = useAuth()
  const navigate = useNavigate()
  const [provinces, setProvinces] = useState([])
  const [pickupWards, setPickupWards] = useState([])
  const [dropoffWards, setDropoffWards] = useState([])
  const [fromProvinceId, setFromProvinceId] = useState('')
  const [toProvinceId, setToProvinceId] = useState('')
  const [pickupWardId, setPickupWardId] = useState('')
  const [dropoffWardId, setDropoffWardId] = useState('')
  const [date, setDate] = useState('')
  const [searchError, setSearchError] = useState('')
  const [openTrips, setOpenTrips] = useState([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    listProvinces().then(setProvinces).catch(() => {})
  }, [])

  useEffect(() => {
    setPickupWardId('')
    if (fromProvinceId) listWards(fromProvinceId).then(setPickupWards).catch(() => setPickupWards([]))
    else setPickupWards([])
  }, [fromProvinceId])

  useEffect(() => {
    setDropoffWardId('')
    if (toProvinceId) listWards(toProvinceId).then(setDropoffWards).catch(() => setDropoffWards([]))
    else setDropoffWards([])
  }, [toProvinceId])

  async function searchTrips() {
    const from = provinces.find((province) => province.id === fromProvinceId)
    const to = provinces.find((province) => province.id === toProvinceId)
    if (!fromProvinceId || !toProvinceId || !pickupWardId || !dropoffWardId || !date) {
      setSearchError('Vui lòng chọn đủ tỉnh, phường/xã và ngày khởi hành')
      return
    }
    if (!from || !to || from.code === to.code) {
      setSearchError('Tỉnh đón và tỉnh trả phải khác nhau')
      return
    }
    setSearchError('')
    setSearching(true)
    setSearched(true)
    try {
      const result = await searchTripsApi({
        startProvinceId: fromProvinceId,
        startWardId: pickupWardId,
        endProvinceId: toProvinceId,
        endWardId: dropoffWardId,
        departureDate: date,
      })
      setOpenTrips(result)
    } catch (error) {
      setOpenTrips([])
      setSearchError(error.response?.data?.message || 'Không tìm được chuyến phù hợp')
    } finally {
      setSearching(false)
    }
  }

  function logout() {
    doLogout()
    navigate('/login')
  }

  return (
    <div className="customer-home">
      <header className="customer-hero">
        <div className="customer-hero-top">
          <div>
            <div className="customer-brand">RIDEUP</div>
            <div className="customer-greeting">Xin chào, {user?.fullName || 'bạn'} <span>👋</span></div>
          </div>
          <button className="hero-action" aria-label="Đăng xuất" onClick={logout}><LogOut size={17} /></button>
        </div>
        <h1>Bạn muốn đi đâu?</h1>
        <p>Đặt nhanh, giá rõ ràng, tài xế đã xác minh.</p>
      </header>

      <main className="customer-content">
        <div className="customer-stats">
          <Stat icon="🚕" value="0" label="Chuyến đang mở" />
          <Stat icon="▣" value="0" label="Lượt đã đi" />
          <Stat icon="★" value="5.0" label="Đánh giá" accent />
        </div>

        <section className="search-panel">
          <div className="panel-heading">
            <h2>Tìm chuyến ghép</h2>
            <span>Chọn điểm đón/trả chi tiết</span>
          </div>

          <SelectRow icon="●" label="TỈNH ĐÓN" value={fromProvinceId} onChange={setFromProvinceId} options={provinces} placeholder="Chọn tỉnh/thành phố đón" />
          <SelectRow icon="⌖" label="KHU VỰC ĐÓN" value={pickupWardId} onChange={setPickupWardId} options={pickupWards} placeholder="Chọn quận/huyện, phường/xã đón" />
          <SelectRow icon="●" label="TỈNH TRẢ" value={toProvinceId} onChange={setToProvinceId} options={provinces} placeholder="Chọn tỉnh/thành phố trả" />
          <SelectRow icon="⌖" label="KHU VỰC TRẢ" value={dropoffWardId} onChange={setDropoffWardId} options={dropoffWards} placeholder="Chọn quận/huyện, phường/xã trả" />
          <label className="date-row">
            <span className="row-icon">▣</span>
            <span className="date-copy"><small>CHỌN NGÀY KHỞI HÀNH</small></span>
            <MobileDatePicker value={date} onChange={setDate} />
          </label>
          <div className="date-shortcuts">
            <button type="button" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Tất cả ngày</button>
            <button type="button" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Hôm nay</button>
            <button type="button" onClick={() => setDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10))}>Ngày mai</button>
          </div>
          {searchError && <div className="customer-search-error">{searchError}</div>}
          <button className="search-button" type="button" disabled={searching} onClick={searchTrips}>{searching ? 'Đang tìm chuyến...' : '⌕  Tìm chuyến ngay'}</button>
        </section>

        <section className="open-trips">
          <div className="section-heading">
            <h2>Chuyến xe đang mở</h2>
            <button type="button" onClick={() => setOpenTrips([])}>Làm mới</button>
          </div>
          {searched && openTrips.length > 0 ? (
            <div className="customer-trip-results">
              {openTrips.map((trip) => <CustomerTripCard key={trip.id} trip={trip} provinces={provinces} seats={1} pickupWardId={pickupWardId} dropoffWardId={dropoffWardId} navigate={navigate} />)}
            </div>
          ) : (
            <div className="empty-trip">
              <div className="empty-icon">🚕</div>
              <strong>{searched ? 'Không có chuyến phù hợp' : 'Chưa có chuyến xe đang mở'}</strong>
              <span>{searched ? 'Thử đổi ngày hoặc điểm đi, điểm đến.' : 'Hãy chọn điểm đi và điểm đến để tìm chuyến phù hợp.'}</span>
              {!searched && <button type="button" onClick={() => document.querySelector('.search-panel')?.scrollIntoView({ behavior: 'smooth' })}>Tìm chuyến</button>}
            </div>
          )}
        </section>
      </main>

      <nav className="customer-bottom-nav" aria-label="Điều hướng chính">
        <NavItem icon={Home} label="Trang chủ" active onClick={() => navigate('/home')} />
        <NavItem icon={CarFront} label="Chuyến xe" onClick={() => navigate('/customer/bookings')} />
        <NavItem icon={MessageCircle} label="Tin nhắn" />
        <NavItem icon={Bell} label="Thông báo" />
        <NavItem icon={UserRound} label="Tài khoản" onClick={logout} />
      </nav>
    </div>
  )
}

function Stat({ icon, value, label, accent }) {
  return <div className="customer-stat"><span className={`stat-icon${accent ? ' accent' : ''}`}>{icon}</span><strong>{value}</strong><small>{label}</small></div>
}

function SelectRow({ icon, label, value, onChange, options, placeholder }) {
  return <div className="select-row"><span className="row-icon">{icon}</span><span className="field-copy"><small>{label}</small><MobilePicker value={value} onChange={onChange} options={options} placeholder={placeholder} /></span></div>
}

function MobilePicker({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const selected = options.find((option) => option.id === value)
  const filtered = options.filter((option) => option.name.toLowerCase().includes(keyword.toLowerCase()))
  return (
    <div className="customer-picker">
      <button type="button" className={`customer-picker-trigger${open ? ' open' : ''}`} onClick={() => setOpen((current) => !current)}>
        <span>{selected?.name || placeholder}</span><span className="chevron">{open ? '⌃' : '›'}</span>
      </button>
      {open && <div className="customer-picker-menu">
        <input autoFocus value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Nhập để tìm kiếm" />
        <div className="customer-picker-options">
          {filtered.length === 0 ? <div className="customer-picker-empty">Không tìm thấy kết quả</div> : filtered.map((option) => (
            <button type="button" key={option.id} className={option.id === value ? 'selected' : ''} onClick={() => { onChange(option.id); setOpen(false); setKeyword('') }}>
              <span>{option.name}</span>{option.id === value && <span>✓</span>}
            </button>
          ))}
        </div>
      </div>}
    </div>
  )
}

function MobileDatePicker({ value, onChange }) {
  const current = value ? new Date(`${value}T00:00:00`) : new Date()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(current.getMonth())
  const [year, setYear] = useState(current.getFullYear())
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const selectedDay = value ? Number(value.slice(8, 10)) : null
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
  function move(offset) {
    const next = new Date(year, month + offset, 1)
    setMonth(next.getMonth())
    setYear(next.getFullYear())
  }
  return <div className="customer-date-picker">
    <button type="button" className={`customer-date-trigger${open ? ' open' : ''}`} onClick={() => setOpen((currentOpen) => !currentOpen)}>
      <span>{value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : 'Chọn ngày khởi hành'}</span><span className="chevron">{open ? '⌃' : '⌄'}</span>
    </button>
    {open && <div className="customer-date-menu">
      <div className="customer-date-menu-header"><button type="button" onClick={() => move(-1)}>‹</button><strong>{monthLabel}</strong><button type="button" onClick={() => move(1)}>›</button></div>
      <div className="customer-date-weekdays">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="customer-date-grid">
        {Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`} />)}
        {Array.from({ length: days }, (_, index) => { const day = index + 1; return <button type="button" key={day} className={day === selectedDay ? 'selected' : ''} onClick={() => { onChange(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`); setOpen(false) }}>{day}</button> })}
      </div>
    </div>}
  </div>
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return <button type="button" className={`bottom-item${active ? ' active' : ''}`} onClick={onClick}><Icon className="customer-nav-icon" size={21} strokeWidth={1.8} /><small>{label}</small></button>
}

function CustomerTripCard({ trip, provinces, seats, pickupWardId, dropoffWardId, navigate }) {
  const provinceName = (id) => provinces.find((province) => province.id === id)?.name || id || '?'
  const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`
  const formatTime = (value) => value ? value.replace('T', ' ').slice(0, 16) : '--'
  return <article className="customer-trip-result-card">
    <div className="customer-trip-result-head">
      <div><strong>{provinceName(trip.startProvinceId)} → {provinceName(trip.endProvinceId)}</strong><small>🕐 {formatTime(trip.departureTime)}</small></div>
      <b>{formatMoney(trip.priceVnd)}<small>/ghế</small></b>
    </div>
    <div className="customer-trip-result-meta"><span>👤 {trip.driverName || 'Tài xế RideUp'}</span><span> Còn {trip.seatAvailable}/{trip.seatTotal} ghế</span></div>
    <button type="button" onClick={() => navigate('/customer/book', { state: { trip, seats, pickupWardId, dropoffWardId } })}>Đặt chỗ</button>
  </article>
}