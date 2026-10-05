import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMyVehicles } from '../api/api'

function badgeFor(v) {
  if (v.isVerified && v.isActive) return { class: 'approved', label: '✅ Đã duyệt' }
  if (v.rejectionReason) return { class: 'rejected', label: '✖️ Bị từ chối' }
  return { class: 'pending', label: '⏳ Chờ admin duyệt' }
}

function fmtDate(s) {
  if (!s) return ''
  return s.substring(0, 10)
}

export default function VehicleListPage() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listMyVehicles()
      .then(setVehicles)
      .catch((e) => setError(e.response?.data?.message || 'Lỗi tải phương tiện'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container-wide">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>🚗 Phương tiện của tôi</h1>
        <button onClick={() => navigate('/driver/vehicles/new')}>
          + Đăng ký xe mới
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <p>Đang tải...</p>
      ) : vehicles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p>Bạn chưa đăng ký phương tiện nào.</p>
          <button onClick={() => navigate('/driver/vehicles/new')}>
            Đăng ký xe ngay
          </button>
        </div>
      ) : (
        vehicles.map((v) => {
          const bdg = badgeFor(v)
          return (
            <div key={v.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>
                    🚗 {v.plateNumber}{' '}
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>
                      · {v.vehicleBrand} {v.vehicleModel} {v.vehicleYear && `(${v.vehicleYear})`}
                    </span>
                  </h3>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>
                    {v.vehicleColor} · {v.seatCapacity} chỗ · {v.vehicleType}
                  </div>
                </div>
                <span className={`badge ${bdg.class}`}>{bdg.label}</span>
              </div>

              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

              <div className="row" style={{ gap: 24, fontSize: 14 }}>
                <div>
                  <div style={{ color: '#6b7280' }}>Hạn đăng ký</div>
                  <div style={{ fontWeight: 600 }}>{fmtDate(v.registrationExpiryDate) || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280' }}>Hạn bảo hiểm</div>
                  <div style={{ fontWeight: 600 }}>{fmtDate(v.insuranceExpiryDate) || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280' }}>Ngày tạo</div>
                  <div style={{ fontWeight: 600 }}>{fmtDate(v.createdAt)}</div>
                </div>
              </div>

              {v.rejectionReason && (
                <div
                  style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: 10,
                    borderRadius: 6,
                    marginTop: 12,
                    fontSize: 14,
                  }}
                >
                  <b>Lý do từ chối:</b> {v.rejectionReason}
                </div>
              )}

              {v.isVerified && v.isActive && (
                <div
                  style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: 10,
                    borderRadius: 6,
                    marginTop: 12,
                    fontSize: 14,
                  }}
                >
                  ✅ Xe đã được admin duyệt. Bạn có thể tạo chuyến.
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}