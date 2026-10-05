import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listProvinces, listWards, searchTrips } from '../api/api'

export default function TripSearchPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchState = location.state || {}
  const [provinces, setProvinces] = useState([])
  const [fromProvinceId, setFromProvinceId] = useState(searchState.fromProvinceId || '')
  const [toProvinceId, setToProvinceId] = useState(searchState.toProvinceId || '')
  const [startWardId, setStartWardId] = useState(searchState.startWardId || '')
  const [endWardId, setEndWardId] = useState(searchState.endWardId || '')
  const [startWards, setStartWards] = useState([])
  const [endWards, setEndWards] = useState([])
  const [date, setDate] = useState(searchState.date || '')
  const [seats, setSeats] = useState(1)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const autoSearchStarted = useRef(false)

  useEffect(() => {
    listProvinces().then(setProvinces).catch(() => setError('Không tải được danh sách tỉnh'))
  }, [])

  useEffect(() => {
    if (fromProvinceId) listWards(fromProvinceId).then(setStartWards).catch(() => setStartWards([]))
    else setStartWards([])
  }, [fromProvinceId])

  useEffect(() => {
    if (toProvinceId) listWards(toProvinceId).then(setEndWards).catch(() => setEndWards([]))
    else setEndWards([])
  }, [toProvinceId])

  async function runSearch() {
    if (!fromProvinceId || !startWardId || !toProvinceId || !endWardId || !date) {
      setError('Vui lòng chọn đủ tỉnh, phường/xã và ngày đi')
      return
    }
    if (fromProvinceId === toProvinceId) {
      setError('Tỉnh đi và tỉnh đến phải khác nhau')
      return
    }
    setError('')
    setLoading(true)
    setSearched(true)
    try {
      const result = await searchTrips({
        startProvinceId: fromProvinceId,
        startWardId,
        endProvinceId: toProvinceId,
        endWardId,
        departureDate: date,
      })
      setTrips(result)
    } catch (e) {
      setError(e.response?.data?.message || 'Lỗi tìm chuyến')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!searchState.autoSearch || autoSearchStarted.current) return
    autoSearchStarted.current = true
    runSearch()
  }, [searchState.autoSearch])

  function onSearch(e) {
    e.preventDefault()
    runSearch()
  }

  function fmtMoney(v) {
    return new Intl.NumberFormat('vi-VN').format(v) + ' đ'
  }

  function fmtDateTime(iso) {
    if (!iso) return ''
    return iso.replace('T', ' ').substring(0, 16)
  }

  return (
    <div className="container-wide">
      <h1>🔍 Tìm chuyến xe ghép</h1>

      <form onSubmit={onSearch} className="card">
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Tỉnh đón *</label>
            <select value={fromProvinceId} onChange={(e) => { setFromProvinceId(e.target.value); setStartWardId('') }} required>
              <option value="">-- Chọn tỉnh --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Khu vực đón *</label>
            <select value={startWardId} onChange={(e) => setStartWardId(e.target.value)} required>
              <option value="">-- Chọn khu vực đón --</option>
              {startWards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Tỉnh trả *</label>
            <select value={toProvinceId} onChange={(e) => { setToProvinceId(e.target.value); setEndWardId('') }} required>
              <option value="">-- Chọn tỉnh --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Khu vực trả *</label>
            <select value={endWardId} onChange={(e) => setEndWardId(e.target.value)} required>
              <option value="">-- Chọn khu vực trả --</option>
              {endWards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Ngày đi *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: 0.5 }}>
            <label>Số ghế</label>
            <input
              type="number"
              min="1"
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Đang tìm...' : 'Tìm'}
            </button>
          </div>
        </div>
      </form>

      {error && <div className="alert error">{error}</div>}

      {searched && !loading && trips.length === 0 && (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>
          Không có chuyến nào phù hợp với tiêu chí của bạn.
        </p>
      )}

      {trips.length > 0 && (
        <>
          <p style={{ marginTop: 16 }}>Tìm thấy <b>{trips.length}</b> chuyến:</p>
          {trips.map((t) => (
            <div key={t.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>
                    🚌 {t.startProvinceName} → {t.endProvinceName}
                  </h3>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>
                    Tài xế: <b>{t.driverName}</b>
                    {t.driverRating > 0 && <> · ⭐ {t.driverRating}</>}
                    {' · '}
                    {t.vehiclePlate && <>🚗 {t.vehiclePlate}</>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>
                    {fmtMoney(t.priceVnd)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>/ghế</div>
                </div>
              </div>

              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

              <div className="row" style={{ gap: 24, fontSize: 14 }}>
                <div>
                  <div style={{ color: '#6b7280' }}>Khởi hành</div>
                  <div style={{ fontWeight: 600 }}>{fmtDateTime(t.departureTime)}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280' }}>Còn trống</div>
                  <div style={{ fontWeight: 600 }}>
                    {t.seatAvailable}/{t.seatTotal} ghế
                  </div>
                </div>
                <div>
                  <div style={{ color: '#6b7280' }}>Tổng tiền</div>
                  <div style={{ fontWeight: 600, color: '#16a34a' }}>
                    {fmtMoney(t.priceVnd * seats)}
                  </div>
                </div>
              </div>

              <div className="row-end" style={{ marginTop: 12 }}>
                <button onClick={() => navigate('/customer/book', { state: { trip: t, seats } })}>
                  Đặt chỗ
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}