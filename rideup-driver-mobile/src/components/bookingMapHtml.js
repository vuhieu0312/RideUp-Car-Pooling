/** HTML bản đồ Leaflet + OpenStreetMap (không cần API key). */
export function buildBookingMapHtml(pickup, dropoff) {
  const points = [];
  if (pickup) points.push({ ...pickup, label: 'Đón', color: '#0caf63' });
  if (dropoff) points.push({ ...dropoff, label: 'Trả', color: '#e5484d' });

  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#m{height:100%;margin:0}.leaflet-tooltip{font:600 11px sans-serif}</style>
</head><body>
<div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var pts = ${JSON.stringify(points)};
var map = L.map('m');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(map);
var latlngs = pts.map(function (p) {
  var ll = [p.lat, p.lng];
  L.circleMarker(ll, { radius: 9, color: '#fff', weight: 3, fillColor: p.color, fillOpacity: 1 })
    .addTo(map)
    .bindTooltip(p.label, { permanent: true, direction: 'top', offset: [0, -8] });
  return ll;
});
if (latlngs.length === 1) map.setView(latlngs[0], 15);
else map.fitBounds(latlngs, { padding: [30, 30] });
</script>
</body></html>`;
}
