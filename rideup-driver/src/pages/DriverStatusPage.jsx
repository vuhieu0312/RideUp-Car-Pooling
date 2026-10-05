import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDriverStatus, getDriverProfile } from '../api/api'

export default function DriverStatusPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const s = await getDriverStatus()
        if (cancelled) return
        setStatus(s)

        if (s.status === 'APPROVED') {
          navigate('/driver')
          return
        }
        // load full profile để hiện chi tiết
        const p = await getDriverProfile()
        if (!cancelled) setProfile(p)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    check()
    // Poll mỗi 10 giây
    const interval = setInterval(check, 10000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [navigate])

  if (loading) {
    return <div className="container"><p>Đang tải trạng thái hồ sơ...</p></div>
  }

  return (
    <div className="container-wide">
      <h1>Hồ sơ tài xế đang được xét duyệt</h1>

      {status?.status === 'PENDING' && (
        <div className="alert warning">
          ⏳ Hồ sơ của bạn đang được admin xét duyệt. Trang này sẽ tự động cập nhật mỗi 10 giây.
        </div>
      )}

      {status?.status === 'REJECTED' && (
        <div className="alert error">
          ❌ Hồ sơ bị từ chối. Lý do: <b>{status.rejectionReason || 'Không có'}</b>
        </div>
      )}

      {profile && (
        <div className="card">
          <h2>Thông tin hồ sơ</h2>
          <p><b>Trạng thái:</b> <span className={`badge ${profile.status?.toLowerCase()}`}>{profile.status}</span></p>
          <p><b>Họ tên:</b> {profile.fullName}</p>
          <p><b>CCCD:</b> {profile.cccd}</p>
          <p><b>GPLX:</b> {profile.gplx}</p>
          <p><b>Hết hạn GPLX:</b> {profile.gplxExpiryDate}</p>
          <p><b>SĐT:</b> {profile.phone}</p>
          {profile.cccdImageFront && (
            <p>
              <b>Ảnh CCCD trước:</b>{' '}
              <a href={`http://localhost:8080${profile.cccdImageFront}`} target="_blank" rel="noreferrer">Xem</a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}