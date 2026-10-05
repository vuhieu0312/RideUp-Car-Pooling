import { useEffect, useRef } from 'react'

/**
 * Map picker - click chọn lat/lng trên bản đồ.
 * Tự động pan về vị trí mới khi prop `value` thay đổi.
 */
export default function MapPicker({
  value,
  onChange,
  color = 'green',
  height = '300px',
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  // Init map (chạy 1 lần khi component mount)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const L = window.L
    if (!L) return

    const initLat = value?.lat ?? 10.7626
    const initLng = value?.lng ?? 106.6602
    const map = L.map(mapRef.current).setView([initLat, initLng], 13)
    mapInstanceRef.current = map

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (e) => {
      placeMarker(e.latlng)
      onChange?.(e.latlng.lat, e.latlng.lng)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mỗi khi value (lat/lng) thay đổi -> pan map + cập nhật marker
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !value?.lat || !value?.lng) return
    map.setView([value.lat, value.lng], 13, { animate: true })
    placeMarker([value.lat, value.lng])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng])

  function placeMarker(latlng) {
    const L = window.L
    if (!L) return
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng)
    } else {
      markerRef.current = L.marker(latlng, {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background:' + color + ';width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(map)
    }
  }

  return (
    <div className="field">
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
      {value?.lat && value?.lng && (
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          📍 {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </div>
      )}
      <div style={{ fontSize: 13, color: '#6b7280' }}>
        🗺️ Click lên bản đồ để chọn vị trí
      </div>
    </div>
  )
}
