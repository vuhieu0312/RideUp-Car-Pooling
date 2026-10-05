import { useEffect, useRef, useState } from 'react'

/**
 * Map picker đơn giản - click lên bản đồ để chọn lat/lng.
 * Dùng Leaflet + OpenStreetMap tiles (free, không cần API key).
 *
 * Props:
 * - label: tiêu đề
 * - value: { lat, lng } hiện tại (optional - ban đầu center)
 * - onChange(lat, lng): callback khi user click chọn điểm
 * - color: màu marker (mặc định xanh)
 * - height: chiều cao map (mặc định 300px)
 */
export default function MapPicker({
  label,
  value,
  initialCenter,
  onChange,
  color = 'green',
  height = '300px',
}) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [lat, setLat] = useState(value?.lat ?? initialCenter?.lat ?? 10.7626)
  const [lng, setLng] = useState(value?.lng ?? initialCenter?.lng ?? 106.6602)
  const [currentPos, setCurrentPos] = useState(null)

  useEffect(() => {
    if (!mapRef.current || mapRef.current._leaflet_id) return

    // Init map (chỉ 1 lần)
    const L = window.L
    if (!L) {
      console.error('Leaflet chưa load. Kiểm tra index.html có CDN script chưa.')
      return
    }

    const map = L.map(mapRef.current).setView([lat, lng], 13)
    mapRef.current._leaflet_id = true
    mapRef.current._leafletMap = map

    // OpenStreetMap tiles - free, không cần API key
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Click handler - đặt marker + gọi callback
    map.on('click', (e) => {
      const { lat: newLat, lng: newLng } = e.latlng
      setCurrentPos({ lat: newLat, lng: newLng })

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng)
      } else {
        markerRef.current = L.marker(e.latlng, {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map)
      }
      onChange?.(newLat, newLng)
    })
  }, [color, onChange])

  useEffect(() => {
    if (!initialCenter || value?.lat != null || value?.lng != null) return
    setLat(initialCenter.lat)
    setLng(initialCenter.lng)
    if (mapRef.current?._leafletMap) {
      mapRef.current._leafletMap.setView([initialCenter.lat, initialCenter.lng], 13)
    }
  }, [initialCenter?.lat, initialCenter?.lng, value?.lat, value?.lng])

  // Update marker khi value thay đổi từ bên ngoài
  useEffect(() => {
    if (value?.lat == null || value?.lng == null) return
    if (value?.lat !== lat || value?.lng !== lng) {
      setLat(value.lat)
      setLng(value.lng)
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng])
      }
    }
  }, [value?.lat, value?.lng])

  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height,
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          marginBottom: 8,
        }}
      />
      {currentPos && (
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          📍 {currentPos.lat.toFixed(6)}, {currentPos.lng.toFixed(6)}
        </div>
      )}
      <div style={{ fontSize: 13, color: '#6b7280' }}>
        🗺️ Click trên bản đồ để chọn vị trí
      </div>
    </div>
  )
}
