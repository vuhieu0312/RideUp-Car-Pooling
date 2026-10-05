import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Check, ChevronLeft, ChevronRight, ChevronUp, Clock3, Minus, Plus } from 'lucide-react'
import { createTrip, listProvinces, listWards, listMyVehicles } from '../api/api'
import BottomNav from '../components/BottomNav'

export default function TripCreatePage() {
  const navigate = useNavigate()
  const [provinces, setProvinces] = useState([])
  const [pickupWards, setPickupWards] = useState([])
  const [dropoffWards, setDropoffWards] = useState([])
  const [pickupWardKeyword, setPickupWardKeyword] = useState('')
  const [dropoffWardKeyword, setDropoffWardKeyword] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    startProvinceId: '',
    endProvinceId: '',
    pickupWardIds: [],
    dropoffWardIds: [],
    departureDate: '',
    departureTime: '',
    seatTotal: 4,
    priceVnd: 120000,
    note: '',
    vehicleId: '',
  })

  useEffect(() => {
    listProvinces().then(setProvinces).catch(() => {})
    listMyVehicles().then(setVehicles).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.startProvinceId) {
      listWards(form.startProvinceId).then(setPickupWards).catch(() => setPickupWards([]))
    } else {
      setPickupWards([])
    }
    setPickupWardKeyword('')
    setForm((f) => ({ ...f, pickupWardIds: [] }))
  }, [form.startProvinceId])

  useEffect(() => {
    if (form.endProvinceId) {
      listWards(form.endProvinceId).then(setDropoffWards).catch(() => setDropoffWards([]))
    } else {
      setDropoffWards([])
    }
    setDropoffWardKeyword('')
    setForm((f) => ({ ...f, dropoffWardIds: [] }))
  }, [form.endProvinceId])


  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }
  function togglePickupWard(id) {
    setForm((f) => ({
      ...f,
      pickupWardIds: f.pickupWardIds.includes(id)
        ? f.pickupWardIds.filter((x) => x !== id)
        : f.pickupWardIds.length >= 4
          ? f.pickupWardIds
          : [...f.pickupWardIds, id],
    }))
  }
  function toggleDropoffWard(id) {
    setForm((f) => ({
      ...f,
      dropoffWardIds: f.dropoffWardIds.includes(id)
        ? f.dropoffWardIds.filter((x) => x !== id)
        : f.dropoffWardIds.length >= 4
          ? f.dropoffWardIds
          : [...f.dropoffWardIds, id],
    }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.startProvinceId || !form.endProvinceId) {
      setError('Vui lòng chọn tỉnh đón và trả')
      return
    }
    if (form.startProvinceId === form.endProvinceId) {
      setError('Tỉnh đón và trả phải khác nhau')
      return
    }
    if (form.pickupWardIds.length === 0 || form.dropoffWardIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 điểm đón và 1 điểm trả')
      return
    }
    if (!form.departureDate || !form.departureTime) {
      setError('Vui lòng chọn ngày giờ khởi hành')
      return
    }
    if (!form.vehicleId) {
      setError('Vui lòng chọn xe')
      return
    }
    setLoading(true)
    try {
      const stops = [
        ...form.pickupWardIds.map((wardId) => ({ stopType: 'PICKUP', wardId })),
        ...form.dropoffWardIds.map((wardId) => ({ stopType: 'DROPOFF', wardId })),
      ]
      await createTrip({
        startProvinceId: form.startProvinceId,
        endProvinceId: form.endProvinceId,
        stops,
        departureTime: `${form.departureDate}T${form.departureTime}:00`,
        seatTotal: form.seatTotal,
        priceVnd: form.priceVnd,
        note: form.note,
      })
      navigate('/driver')
    } catch (e) {
      setError(e.response?.data?.message || 'Tạo chuyến thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="driver-create-page">
      <div className="driver-create-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="driver-create-back" type="button" onClick={() => navigate('/driver')} aria-label="Quay lại"><ChevronLeft size={18} /></button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Tạo chuyến xe</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Thêm chuyến xe vào lịch trình</div>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="driver-create-form">
        <Section title="1. Tuyến đường">
          <Picker label="Tỉnh đón" value={form.startProvinceId} onChange={(v) => set('startProvinceId', v)} options={provinces} />
          <AreaPickerBlock title="Khu vực đón" count={form.pickupWardIds.length} wards={pickupWards} selectedIds={form.pickupWardIds} keyword={pickupWardKeyword} setKeyword={setPickupWardKeyword} onToggle={togglePickupWard} emptyText="Vui lòng chọn tỉnh đón trước" placeholder="Chọn quận/huyện, phường/xã đón" />
          <Picker label="Tỉnh trả" value={form.endProvinceId} onChange={(v) => set('endProvinceId', v)} options={provinces} />
          <AreaPickerBlock title="Khu vực trả" count={form.dropoffWardIds.length} wards={dropoffWards} selectedIds={form.dropoffWardIds} keyword={dropoffWardKeyword} setKeyword={setDropoffWardKeyword} onToggle={toggleDropoffWard} emptyText="Vui lòng chọn tỉnh trả trước" placeholder="Chọn quận/huyện, phường/xã trả" />
        </Section>

        <Section title="2. Lịch khởi hành">
          <div className="driver-date-time-grid">
            <label className="driver-date-time-field">
              <span>Ngày</span>
              <MobileDatePicker value={form.departureDate} onChange={(value) => set('departureDate', value)} />
            </label>
            <label className="driver-date-time-field">
              <span>Giờ</span>
              <MobileTimePicker value={form.departureTime} onChange={(value) => set('departureTime', value)} />
            </label>
          </div>
        </Section>

        <Section title="3. Số ghế">
          <Counter value={form.seatTotal} onChange={(v) => set('seatTotal', v)} min={1} max={20} />
        </Section>

        <Section title="Giá vé (VND/khách)">
          <input type="number" min="0" value={form.priceVnd} onChange={(e) => set('priceVnd', Number(e.target.value))} style={inputStyle} />
        </Section>

        <Section title="4. Ghi chú (tùy chọn)">
          <textarea value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Ví dụ: Có đón dọc đường, đón linh hoạt..." rows="3" style={{ ...inputStyle, resize: 'vertical' }} />
        </Section>

        <Section title="5. Thông tin xe">
          {vehicles.length === 0 ? (
            <Empty text="Chưa đăng ký xe. Vào 'Phương tiện của tôi' để đăng ký." />
          ) : (
            vehicles.map((v) => (
              <VehicleRow key={v.id} vehicle={v} selected={form.vehicleId === v.id} onSelect={() => set('vehicleId', v.id)} />
            ))
          )}
        </Section>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 14 }}>{error}</div>}

        <button
          className="driver-submit-button"
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 14, background: '#08b85c', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: 'pointer', marginTop: 16, marginBottom: 16 }}
        >
          {loading ? 'Đang tạo...' : 'Tạo chuyến xe'}
        </button>
      </form>
      <BottomNav />
    </div>
  )
}

function Section({ title, right, children }) {
  return (
    <div className="driver-create-section" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        {right && <div style={{ fontSize: 12, color: '#6b7280' }}>{right}</div>}
      </div>
      {children}
    </div>
  )
}

function AreaPickerBlock({ title, count, wards, selectedIds, keyword, setKeyword, onToggle, emptyText, placeholder }) {
  return (
    <div className="area-picker-block">
      <div className="area-picker-heading"><span>{title}</span><small>({count}/4)</small></div>
      {wards.length === 0 ? <Empty text={emptyText} /> : <WardMultiPicker wards={wards} selectedIds={selectedIds} keyword={keyword} setKeyword={setKeyword} onToggle={onToggle} placeholder={placeholder} />}
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{children}</div>
}

function MobileTimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [hour, minute] = value ? value.split(':').map(Number) : [null, null]

  function choose(nextHour, nextMinute, close = false) {
    onChange(`${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`)
    if (close) setOpen(false)
  }

  return (
    <div className="mobile-time-picker">
      <button type="button" className={`mobile-time-trigger${open ? ' open' : ''}`} onClick={() => setOpen((current) => !current)}>
        <span>{value ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : '--:--'}</span>
        <Clock3 className="picker-icon" size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="mobile-time-menu">
          <TimeColumn values={Array.from({ length: 24 }, (_, index) => index)} selected={hour} format={(item) => String(item).padStart(2, '0')} onSelect={(item) => choose(item, minute || 0)} />
          <TimeColumn values={Array.from({ length: 12 }, (_, index) => index * 5)} selected={minute} format={(item) => String(item).padStart(2, '0')} onSelect={(item) => choose(hour || 0, item, true)} />
        </div>
      )}
    </div>
  )
}

function WardMultiPicker({ wards, selectedIds, keyword, setKeyword, onToggle, placeholder }) {
  const [open, setOpen] = useState(false)
  const selectedWards = wards.filter((ward) => selectedIds.includes(ward.id))
  const filteredWards = wards.filter((ward) => ward.name.toLowerCase().includes(keyword.toLowerCase()))
  const summary = selectedWards.length === 0
    ? placeholder
    : selectedWards.length === 1
      ? selectedWards[0].name
      : `${selectedWards[0].name} và ${selectedWards.length - 1} điểm khác`

  return (
    <div className="ward-multi-picker">
      <button type="button" className={`ward-multi-trigger${open ? ' open' : ''}`} onClick={() => setOpen((current) => !current)}>
        <span className={selectedWards.length === 0 ? 'placeholder' : ''}>{summary}</span>
        {open ? <ChevronUp className="picker-chevron" size={17} /> : <ChevronRight className="picker-chevron" size={17} />}
      </button>
      {open && (
        <div className="ward-multi-menu">
          <input autoFocus value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Nhập để tìm kiếm" />
          <div className="ward-multi-options">
            {filteredWards.length === 0 ? <Empty text="Không tìm thấy phường/xã phù hợp" /> : filteredWards.map((ward) => {
              const selected = selectedIds.includes(ward.id)
              return <button type="button" key={ward.id} className={selected ? 'selected' : ''} onClick={() => { onToggle(ward.id); setOpen(false) }}>
                <span className={`ward-check${selected ? ' checked' : ''}`}>{selected && <Check size={12} />}</span>
                <span>{ward.name}</span>
              </button>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MobileDatePicker({ value, onChange }) {
  const today = new Date()
  const initialDate = value ? new Date(`${value}T00:00:00`) : today
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(initialDate.getMonth())
  const [year, setYear] = useState(initialDate.getFullYear())
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
  const selectedDay = value ? Number(value.slice(8, 10)) : null

  function changeMonth(offset) {
    const next = new Date(year, month + offset, 1)
    setMonth(next.getMonth())
    setYear(next.getFullYear())
  }

  function chooseDay(day) {
    onChange(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <div className="mobile-date-picker">
      <button type="button" className={`mobile-date-trigger${open ? ' open' : ''}`} onClick={() => setOpen((current) => !current)}>
        <span>{value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '--/--/----'}</span>
        <CalendarDays className="picker-icon" size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="mobile-date-menu">
          <div className="mobile-date-menu-header">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Tháng trước"><ChevronLeft size={16} /></button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Tháng sau"><ChevronRight size={16} /></button>
          </div>
          <div className="mobile-date-weekdays">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="mobile-date-grid">
            {Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              return <button type="button" key={day} className={day === selectedDay ? 'selected' : ''} onClick={() => chooseDay(day)}>{day}</button>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TimeColumn({ values, selected, format, onSelect }) {
  return (
    <div className="mobile-time-column">
      {values.map((item) => (
        <button type="button" key={item} className={item === selected ? 'selected' : ''} onClick={() => onSelect(item)}>{format(item)}</button>
      ))}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: 10,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  background: 'white',
}

function Picker({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const selected = options.find((option) => option.id === value)
  const filteredOptions = options.filter((option) => option.name.toLowerCase().includes(keyword.toLowerCase()))

  return (
    <div className="mobile-picker">
      <Label>{label}</Label>
      <button type="button" className={`mobile-picker-trigger${open ? ' open' : ''}`} onClick={() => setOpen((current) => !current)}>
        <span>{selected?.name || '-- Chọn tỉnh --'}</span>
        {open ? <ChevronUp className="picker-chevron" size={17} /> : <ChevronRight className="picker-chevron" size={17} />}
      </button>
      {open && (
        <div className="mobile-picker-menu">
          <input autoFocus value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm tỉnh/thành phố" />
          <div className="mobile-picker-options">
            {filteredOptions.length === 0 ? <Empty text="Không tìm thấy tỉnh phù hợp" /> : filteredOptions.map((option) => (
              <button type="button" key={option.id} className={option.id === value ? 'selected' : ''} onClick={() => { onChange(option.id); setOpen(false); setKeyword('') }}>
                <span>{option.name}</span>
                {option.id === value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: checked ? '#dcfce7' : 'white', border: '1px solid ' + (checked ? '#16a34a' : '#e5e7eb'), borderRadius: 6, marginBottom: 6, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 16, height: 16 }} />
      <span style={{ fontSize: 14 }}>{label}</span>
    </label>
  )
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: 16, color: '#9ca3af', fontSize: 13, background: 'white', borderRadius: 6 }}>
      {text}
    </div>
  )
}

function Counter({ value, onChange, min, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={counterBtn}><Minus size={17} /></button>
      <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 700 }}>{value}</div>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} style={counterBtn}><Plus size={17} /></button>
    </div>
  )
}

const counterBtn = {
  width: 44,
  height: 44,
  borderRadius: 22,
  border: 'none',
  background: '#08b85c',
  color: 'white',
  fontSize: 22,
  fontWeight: 700,
  cursor: 'pointer',
}

function VehicleRow({ vehicle, selected, onSelect }) {
  return (
    <div onClick={onSelect} style={{ background: selected ? '#fff7ed' : 'white', border: '1px solid ' + (selected ? '#ea580c' : '#e5e7eb'), borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#6b7280' }}>Loại xe</span>
        <span style={{ fontWeight: 600 }}>{vehicle.vehicleType || '—'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#6b7280' }}>Biển số xe</span>
        <span style={{ fontWeight: 600 }}>{vehicle.plateNumber || '—'}</span>
      </div>
    </div>
  )
}