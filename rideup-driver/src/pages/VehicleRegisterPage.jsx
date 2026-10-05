import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMyVehicles, registerVehicle } from '../api/api'

const VEHICLE_TYPES = [
  { value: 'CAR', label: 'Ô tô con (4 chỗ)' },
  { value: 'SUV', label: 'SUV / 7 chỗ' },
  { value: 'VAN', label: 'Van / 16 chỗ' },
]

export default function VehicleRegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    seatCapacity: 4,
    vehicleType: 'CAR',
    registrationExpiryDate: '',
    insuranceExpiryDate: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Nếu tài xế đã có xe → redirect về list xe
  useEffect(() => {
    listMyVehicles()
      .then((vs) => {
        if (vs && vs.length > 0) {
          navigate('/driver/vehicles', { replace: true })
        }
      })
      .catch(() => {/* im lặng nếu lỗi, vẫn cho đăng ký */})
  }, [navigate])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (!/^\d{2,3}[A-Z]?\d{4,5}$/.test(form.plateNumber.toUpperCase().replace(/[-\s]/g, ''))) {
      setError('Biển số không hợp lệ (vd: 29A-12345, 51B-123.45)')
      return
    }

    setLoading(true)
    try {
      const payload = {
        plateNumber: form.plateNumber.toUpperCase().replace(/[-\s]/g, ''),
        vehicleBrand: form.vehicleBrand || null,
        vehicleModel: form.vehicleModel || null,
        vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : null,
        vehicleColor: form.vehicleColor || null,
        seatCapacity: Number(form.seatCapacity),
        vehicleType: form.vehicleType,
        registrationExpiryDate: form.registrationExpiryDate || null,
        insuranceExpiryDate: form.insuranceExpiryDate || null,
      }
      const result = await registerVehicle(payload)
      const id = result?.data?.id
      alert(`Đăng ký xe thành công!\n\nBiển số: ${form.plateNumber}\n\nĐang chờ admin duyệt.`)
      navigate('/driver/vehicles')
    } catch (e) {
      setError(e.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-wide">
      <h1>🚌 Đăng ký phương tiện</h1>
      <div className="alert info">
        Sau khi đăng ký, admin sẽ duyệt hồ sơ phương tiện. Bạn có thể tạo chuyến sau khi admin duyệt xong.
      </div>
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={submit} className="card">
        <div className="row" style={{ gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Biển số xe *</label>
            <input
              value={form.plateNumber}
              onChange={(e) => set('plateNumber', e.target.value.toUpperCase())}
              placeholder="VD: 29A-12345"
              maxLength={15}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Hãng xe</label>
            <input
              value={form.vehicleBrand}
              onChange={(e) => set('vehicleBrand', e.target.value)}
              placeholder="Toyota, Honda, Mazda..."
            />
          </div>
        </div>

        <div className="row" style={{ gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Dòng xe</label>
            <input
              value={form.vehicleModel}
              onChange={(e) => set('vehicleModel', e.target.value)}
              placeholder="Vios, City, CX-5..."
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Năm sản xuất</label>
            <input
              type="number"
              min="1990"
              max="2030"
              value={form.vehicleYear}
              onChange={(e) => set('vehicleYear', e.target.value)}
              placeholder="2020"
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Màu xe</label>
            <input
              value={form.vehicleColor}
              onChange={(e) => set('vehicleColor', e.target.value)}
              placeholder="Trắng, Đen, Bạc..."
            />
          </div>
        </div>

        <div className="row" style={{ gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Số ghế *</label>
            <input
              type="number"
              min="2"
              max="50"
              value={form.seatCapacity}
              onChange={(e) => set('seatCapacity', e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Loại xe *</label>
            <select
              value={form.vehicleType}
              onChange={(e) => set('vehicleType', e.target.value)}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row" style={{ gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Hạn đăng ký xe</label>
            <input
              type="date"
              value={form.registrationExpiryDate}
              onChange={(e) => set('registrationExpiryDate', e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Hạn bảo hiểm</label>
            <input
              type="date"
              value={form.insuranceExpiryDate}
              onChange={(e) => set('insuranceExpiryDate', e.target.value)}
            />
          </div>
        </div>

        <div className="row-end">
          <button type="button" className="secondary" onClick={() => navigate('/driver')}>
            Huỷ
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký xe'}
          </button>
        </div>
      </form>
    </div>
  )
}