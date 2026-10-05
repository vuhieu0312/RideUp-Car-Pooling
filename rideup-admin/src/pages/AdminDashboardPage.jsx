import { useEffect, useState } from 'react'
import { listDrivers, approveDriver, rejectDriver } from '../api/api'

export default function AdminDashboardPage() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [actionMsg, setActionMsg] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await listDrivers(filter)
      setDrivers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function approve(id) {
    if (!confirm('Duyệt hồ sơ tài xế này?')) return
    try {
      const r = await approveDriver(id)
      setActionMsg(`✅ ${r.message}`)
      load()
    } catch (e) {
      setActionMsg(`❌ ${e.response?.data?.message || 'Lỗi'}`)
    }
  }

  async function reject(id) {
    const reason = prompt('Lý do từ chối:')
    if (!reason) return
    try {
      const r = await rejectDriver(id, reason)
      setActionMsg(`✅ ${r.message}`)
      load()
    } catch (e) {
      setActionMsg(`❌ ${e.response?.data?.message || 'Lỗi'}`)
    }
  }

  return (
    <div className="container-wide">
      <h1>Quản lý tài xế</h1>

      <div className="row" style={{ marginBottom: 16 }}>
        <button className={filter === 'PENDING' ? '' : 'secondary'} onClick={() => setFilter('PENDING')}>
          Chờ duyệt
        </button>
        <button className={filter === 'APPROVED' ? '' : 'secondary'} onClick={() => setFilter('APPROVED')}>
          Đã duyệt
        </button>
        <button className={filter === 'REJECTED' ? '' : 'secondary'} onClick={() => setFilter('REJECTED')}>
          Bị từ chối
        </button>
      </div>

      {actionMsg && <div className="alert info">{actionMsg}</div>}

      {loading ? (
        <p>Đang tải...</p>
      ) : drivers.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Không có tài xế nào trong trạng thái {filter}.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>CCCD</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id}>
                <td>{d.fullName}</td>
                <td>{d.email}</td>
                <td>{d.cccd}</td>
                <td><span className={`badge ${d.status?.toLowerCase()}`}>{d.status}</span></td>
                <td>
                  {filter === 'PENDING' && (
                    <>
                      <button className="success" onClick={() => approve(d.id)} style={{ marginRight: 8 }}>
                        Duyệt
                      </button>
                      <button className="danger" onClick={() => reject(d.id)}>
                        Từ chối
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}