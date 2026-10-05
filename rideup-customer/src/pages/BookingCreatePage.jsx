import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, CarFront, Home, MessageCircle, UserRound } from 'lucide-react'
import { createBooking, listWards } from '../api/api'
import MapPicker from '../components/MapPicker'

export default function BookingCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const trip = location.state?.trip
  const defaultSeats = location.state?.seats || 1
  const pickupWardId = location.state?.pickupWardId
  const dropoffWardId = location.state?.dropoffWardId

  const [seats, setSeats] = useState(defaultSeats)
  const [pickupText, setPickupText] = useState('')
  const [pickupLat, setPickupLat] = useState(null)
  const [pickupLng, setPickupLng] = useState(null)
  const [dropoffText, setDropoffText] = useState('')
  const [dropoffLat, setDropoffLat] = useState(null)
  const [dropoffLng, setDropoffLng] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pickupCenter, setPickupCenter] = useState(null)
  const [dropoffCenter, setDropoffCenter] = useState(null)

  useEffect(() => {
    if (!trip) navigate('/customer/search')
  }, [trip, navigate])

  useEffect(() => {
    if (!trip || (!pickupWardId && !dropoffWardId)) return
    Promise.all([
      pickupWardId ? listWards(trip.startProvinceId) : Promise.resolve([]),
      dropoffWardId ? listWards(trip.endProvinceId) : Promise.resolve([]),
    ]).then(([pickupWards, dropoffWards]) => {
      const pickupWard = pickupWards.find((ward) => ward.id === pickupWardId)
      const dropoffWard = dropoffWards.find((ward) => ward.id === dropoffWardId)
      if (pickupWard?.lat != null && pickupWard?.lng != null) setPickupCenter({ lat: Number(pickupWard.lat), lng: Number(pickupWard.lng) })
      if (dropoffWard?.lat != null && dropoffWard?.lng != null) setDropoffCenter({ lat: Number(dropoffWard.lat), lng: Number(dropoffWard.lng) })
    }).catch(() => {})
  }, [trip, pickupWardId, dropoffWardId])

  if (!trip) return null

  const totalAmount = trip.priceVnd * seats

  function fmtMoney(v) {
    return new Intl.NumberFormat('vi-VN').format(v) + ' đ'
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (seats > trip.seatAvailable) {
      setError(`Chuyến chỉ còn ${trip.seatAvailable} ghế`)
      return
    }

    setLoading(true)
    try {
      await createBooking({
        tripId: trip.id,
        seatCount: seats,
        pickupAddressText: pickupText || null,
        pickupLat,
        pickupLng,
        dropoffAddressText: dropoffText || null,
        dropoffLat,
        dropoffLng,
        note: note || null,
      })
      navigate('/customer/bookings')
    } catch (e) {
      setError(e.response?.data?.message || 'Đặt chỗ thất bại')
    } finally {
      setLoading(false)
    }
  }

  function setPickup(lat, lng) {
    setPickupLat(lat)
    setPickupLng(lng)
  }

  function setDropoff(lat, lng) {
    setDropoffLat(lat)
    setDropoffLng(lng)
  }

  return (
    <div className="customer-booking-create-page">
      <header className="customer-booking-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="Quay lại"><ArrowLeft size={18} /></button>
        <div><small>RIDEUP</small><h1>Đặt chỗ chuyến xe</h1></div>
      </header>
      <main className="customer-booking-content">

      <div className="card" style={{ background: '#f9fafb' }}>
        <h3>Thông tin chuyến</h3>
        <p>
          🚌 <b>{trip.startProvinceName}</b> → <b>{trip.endProvinceName}</b>
        </p>
        <p>
          Khởi hành: {trip.departureTime?.replace('T', ' ').substring(0, 16)} · Tài xế: {trip.driverName}
          {trip.driverRating > 0 && ` · ⭐ ${trip.driverRating}`}
        </p>
        <p>
          Còn {trip.seatAvailable}/{trip.seatTotal} ghế · Giá: {fmtMoney(trip.priceVnd)}/ghế
        </p>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={submit}>
        <div className="field">
          <label>Số ghế muốn đặt</label>
          <input
            type="number"
            min="1"
            max={trip.seatAvailable}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            required
          />
        </div>

        <h3>📍 Điểm đón</h3>
        <MapPicker
          value={{ lat: pickupLat, lng: pickupLng }}
          initialCenter={pickupCenter}
          onChange={setPickup}
          color="green"
          height="180px"
          label="Click lên bản đồ để chọn điểm đón"
        />
        <div className="field">
          <label>Địa chỉ đón (mô tả)</label>
          <input
            value={pickupText}
            onChange={(e) => setPickupText(e.target.value)}
            placeholder="Số 1 Võ Văn Ngân, Q. Thủ Đức"
          />
        </div>

        <h3>🏁 Điểm trả</h3>
        <MapPicker
          value={{ lat: dropoffLat, lng: dropoffLng }}
          initialCenter={dropoffCenter}
          onChange={setDropoff}
          color="red"
          height="180px"
          label="Click lên bản đồ để chọn điểm trả"
        />
        <div className="field">
          <label>Địa chỉ trả (mô tả)</label>
          <input
            value={dropoffText}
            onChange={(e) => setDropoffText(e.target.value)}
            placeholder="Số 10 Phạm Văn Đồng, Q. Cầu Giấy"
          />
        </div>

        <div className="field">
          <label>Ghi chú cho tài xế</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tôi sẽ mang theo 1 vali lớn..."
          />
        </div>

        <div className="booking-total" style={{ background: '#ecfdf5', borderColor: '#16a34a' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, color: '#15803d' }}>Tổng tiền</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#15803d' }}>
                {fmtMoney(totalAmount)}
              </div>
            </div>
            <div style={{ fontSize: 14, color: '#15803d' }}>
              ({seats} ghế × {fmtMoney(trip.priceVnd)})
            </div>
          </div>
        </div>

        <div className="row-end" style={{ marginTop: 12 }}>
          <button type="button" className="secondary" onClick={() => navigate(-1)}>
            Quay lại
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Đang đặt...' : 'Xác nhận đặt chỗ'}
          </button>
        </div>
      </form>
      </main>
      <nav className="customer-bottom-nav" aria-label="Điều hướng chính">
        <BookingNavItem icon={Home} label="Trang chủ" onClick={() => navigate('/home')} />
        <BookingNavItem icon={CarFront} label="Chuyến xe" active onClick={() => navigate('/customer/bookings')} />
        <BookingNavItem icon={MessageCircle} label="Tin nhắn" />
        <BookingNavItem icon={Bell} label="Thông báo" />
        <BookingNavItem icon={UserRound} label="Tài khoản" />
      </nav>
    </div>
  )
}

function BookingNavItem({ icon: Icon, label, active, onClick }) {
  return <button type="button" className={`bottom-item${active ? ' active' : ''}`} onClick={onClick}><Icon className="customer-nav-icon" size={21} strokeWidth={1.8} /><small>{label}</small></button>
}
