import { useEffect, useState } from 'react'
import { approveDriver, approveVehicle, getLocationStats, listDrivers, listPendingVehicles, rejectDriver, rejectVehicle } from '../api/api'

function fmtDate(s) {
  return s ? s.substring(0, 10) : '—'
}

export default function DashboardPage() {
  const [tab, setTab] = useState('drivers') // 'drivers' | 'vehicles' | 'locations'
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  async function loadDrivers() {
    setLoading(true)
    try {
      const data = await listDrivers('PENDING')
      setDrivers(data)
    } catch (e) {
      setMsg('Lỗi tải drivers: ' + (e.response?.data?.message || e.message))
    } finally {
      setLoading(false)
    }
  }

  async function loadVehicles() {
    setLoading(true)
    try {
      const data = await listPendingVehicles()
      setVehicles(data)
    } catch (e) {
      setMsg('Lỗi tải vehicles: ' + (e.response?.data?.message || e.message))
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const data = await getLocationStats()
      setStats(data)
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    if (tab === 'drivers') loadDrivers()
    else if (tab === 'vehicles') loadVehicles()
    else loadStats()
  }, [tab])

  async function approveD(id) {
    if (!confirm('Duyệt hồ sơ tài xế này?')) return
    try {
      const r = await approveDriver(id)
      setMsg('✅ ' + r.message)
      loadDrivers()
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message))
    }
  }

  async function rejectD(id) {
    const reason = prompt('Lý do từ chối:')
    if (!reason) return
    try {
      const r = await rejectDriver(id, reason)
      setMsg('✅ ' + r.message)
      loadDrivers()
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message))
    }
  }

  async function approveV(id) {
    if (!confirm('Duyệt phương tiện này?')) return
    try {
      const r = await approveVehicle(id)
      setMsg('✅ ' + r.message)
      loadVehicles()
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message))
    }
  }

  async function rejectV(id) {
    const reason = prompt('Lý do từ chối:')
    if (!reason) return
    try {
      const r = await rejectVehicle(id, reason)
      setMsg('✅ ' + r.message)
      loadVehicles()
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message))
    }
  }

  return (
    <div className="container-wide">
      <h1>🛡️ Dashboard Admin</h1>

      {msg && (
        <div className="alert alert-info" style={{
          background: msg.startsWith('❌') ? '#fee2e2' : '#dcfce7',
          color: msg.startsWith('❌') ? '#991b1b' : '#166534',
        }}>
          {msg}
        </div>
      )}

      <div className="tab-row">
        <button
          className={tab === 'drivers' ? 'active' : ''}
          onClick={() => setTab('drivers')}
        >
          Tài xế chờ duyệt ({drivers.length})
        </button>
        <button
          className={tab === 'vehicles' ? 'active' : ''}
          onClick={() => setTab('vehicles')}
        >
          Phương tiện chờ duyệt ({vehicles.length})
        </button>
        <button
          className={tab === 'locations' ? 'active' : ''}
          onClick={() => setTab('locations')}
        >
          Thống kê
        </button>
      </div>

      {tab === 'drivers' && (
        loading ? <p>Đang tải...</p> : drivers.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Không có tài xế chờ duyệt.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>CCCD</th>
                <th>GPLX</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.fullName}</b></td>
                  <td>{d.email}</td>
                  <td>{d.phone}</td>
                  <td>{d.cccd}</td>
                  <td>{d.gplx}</td>
                  <td>{fmtDate(d.createdAt)}</td>
                  <td>
                    <button
                      className="success"
                      onClick={() => approveD(d.id)}
                      style={{ marginRight: 6 }}
                    >
                      Duyệt
                    </button>
                    <button className="danger" onClick={() => rejectD(d.id)}>
                      Từ chối
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === 'vehicles' && (
        loading ? <p>Đang tải...</p> : vehicles.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Không có phương tiện chờ duyệt.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Biển số</th>
                <th>Chủ sở hữu</th>
                <th>Loại xe</th>
                <th>Số ghế</th>
                <th>Hạn đăng ký</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td><b>{v.plateNumber}</b></td>
                  <td>{v.driverName} ({v.driverId?.substring(0, 8)}...)</td>
                  <td>{v.vehicleType}</td>
                  <td>{v.seatCapacity}</td>
                  <td>{fmtDate(v.registrationExpiryDate)}</td>
                  <td>
                    <button
                      className="success"
                      onClick={() => approveV(v.id)}
                      style={{ marginRight: 6 }}
                    >
                      Duyệt
                    </button>
                    <button className="danger" onClick={() => rejectV(v.id)}>
                      Từ chối
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === 'locations' && (
        <div className="card">
          <h2>Thống kê dữ liệu địa lý</h2>
          {stats ? (
            <div className="detail-row">
              <div className="label">Tổng tỉnh/thành:</div>
              <div><b>{stats.provinces}</b></div>
              <div className="label">Tổng phường/xã:</div>
              <div><b>{stats.wards}</b></div>
            </div>
          ) : (
            <p>Đang tải...</p>
          )}
        </div>
      )}
    </div>
  )
}