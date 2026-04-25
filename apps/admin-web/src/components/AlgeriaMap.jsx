import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { getWilayaCenter } from '../data/wilayas'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Icon factory ─────────────────────────────────────────────────────────────

const makeIcon = (color, shape = 'circle', size = 18) => {
  let html
  if (shape === 'square') {
    html = `<div style="width:${size}px;height:${size}px;border-radius:3px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`
  } else if (shape === 'diamond') {
    html = `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.45);transform:rotate(45deg)"></div>`
  } else {
    html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`
  }
  return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

// Layer keys and their visual config
export const LAYER_CONFIG = {
  source_active:  { color: '#16a34a', shape: 'circle',  label: 'Source active' },
  source_pending: { color: '#f59e0b', shape: 'circle',  label: 'Source en attente' },
  lot:            { color: '#3b82f6', shape: 'circle',  label: 'Lot collecté' },
  exception:      { color: '#8b5cf6', shape: 'circle',  label: 'Exception' },
  depot:          { color: '#0ea5e9', shape: 'square',  label: 'Dépôt' },
  laverie:        { color: '#f97316', shape: 'square',  label: 'Laverie' },
  transformateur_t1: { color: '#06b6d4', shape: 'diamond', label: 'Transformateur T1' },
  transformateur_t2: { color: '#6366f1', shape: 'diamond', label: 'Transformateur T2' },
}

const ICONS = Object.fromEntries(
  Object.entries(LAYER_CONFIG).map(([k, v]) => [k, makeIcon(v.color, v.shape)])
)

// ── Position helper ───────────────────────────────────────────────────────────

function getPosition(item) {
  if (item.gps_lat && item.gps_lng)   return [item.gps_lat, item.gps_lng]
  if (item.gps?.lat && item.gps?.lng) return [item.gps.lat, item.gps.lng]
  if (item.wilaya)                    return getWilayaCenter(item.wilaya)
  return null
}

// ── Legend item component ─────────────────────────────────────────────────────

function LegendItem({ layerKey, config, active, onToggle }) {
  const shapeStyle = {
    width: 12, height: 12, flexShrink: 0,
    background: active ? config.color : '#d1d5db',
    border: '1.5px solid white',
    boxShadow: '0 1px 3px rgba(0,0,0,.3)',
    borderRadius: config.shape === 'circle' ? '50%'
      : config.shape === 'diamond' ? '2px'
      : '2px',
    transform: config.shape === 'diamond' ? 'rotate(45deg)' : 'none',
    transition: 'background .15s',
  }
  return (
    <button
      onClick={() => onToggle(layerKey)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
        active
          ? 'bg-white border border-gray-200 shadow-sm text-gray-700'
          : 'bg-gray-100 border border-transparent text-gray-400'
      }`}
      title={active ? `Masquer ${config.label}` : `Afficher ${config.label}`}
    >
      <span style={shapeStyle} />
      {config.label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AlgeriaMap({
  sources        = [],
  lots           = [],
  exceptions     = [],
  depots         = [],
  laveries       = [],
  transformateurs = [],
  height         = '400px',
}) {
  // All layers visible by default
  const [visibleLayers, setVisibleLayers] = useState(
    Object.fromEntries(Object.keys(LAYER_CONFIG).map(k => [k, true]))
  )

  const toggle = key => setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }))
  const allOn  = Object.values(visibleLayers).every(Boolean)
  const toggleAll = () => setVisibleLayers(
    Object.fromEntries(Object.keys(LAYER_CONFIG).map(k => [k, !allOn]))
  )

  const markers = []

  if (visibleLayers.source_active || visibleLayers.source_pending) {
    sources.forEach(s => {
      const pos = getPosition(s)
      if (!pos) return
      const key = s.status === 'active' ? 'source_active' : 'source_pending'
      if (!visibleLayers[key]) return
      markers.push({
        pos, icon: ICONS[key],
        label: s.name,
        detail: `${s.source_type} · ${s.wilaya}`,
        sub: `Statut : ${s.status}`,
      })
    })
  }

  if (visibleLayers.lot) {
    lots.forEach(l => {
      const pos = getPosition(l)
      if (!pos) return
      markers.push({
        pos, icon: ICONS.lot,
        label: l.lot_id,
        detail: `${l.status} · ${l.observed_weight_kg ?? l.observed_weight_kg} kg`,
      })
    })
  }

  if (visibleLayers.exception) {
    exceptions.forEach(e => {
      const pos = getPosition(e)
      if (!pos) return
      markers.push({ pos, icon: ICONS.exception, label: 'Exception', detail: e.reason })
    })
  }

  if (visibleLayers.depot) {
    depots.forEach(d => {
      const pos = getPosition(d)
      if (!pos) return
      markers.push({
        pos, icon: ICONS.depot,
        label: d.name,
        detail: `${d.wilaya} · ${d.commune}`,
        sub: `Location : ${d.location_cost_da?.toLocaleString('fr-DZ')} DA/mois${d.capacity_kg ? ` · Cap. ${d.capacity_kg.toLocaleString('fr-DZ')} kg` : ''}`,
      })
    })
  }

  if (visibleLayers.laverie) {
    laveries.forEach(l => {
      const pos = getPosition(l)
      if (!pos) return
      markers.push({
        pos, icon: ICONS.laverie,
        label: l.name,
        detail: `${l.wilaya} · ${l.commune}`,
        sub: `Lavage : ${l.cleaning_cost_per_kg_da} DA / kg`,
      })
    })
  }

  transformateurs.forEach(t => {
    const pos = getPosition(t)
    if (!pos) return
    const key = t.type === 'T2' ? 'transformateur_t2' : 'transformateur_t1'
    if (!visibleLayers[key]) return
    markers.push({
      pos, icon: ICONS[key],
      label: t.name,
      detail: `${t.wilaya} · ${t.commune}`,
      sub: `Type ${t.type}`,
    })
  })

  return (
    <div>
      {/* Filterable legend */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={toggleAll}
          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
            allOn
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white border-gray-300 text-gray-600 hover:border-brand-400'
          }`}
        >
          {allOn ? 'Tout masquer' : 'Tout afficher'}
        </button>
        <span className="text-xs text-gray-400 hidden sm:block">|</span>
        {Object.entries(LAYER_CONFIG).map(([key, cfg]) => (
          <LegendItem
            key={key}
            layerKey={key}
            config={cfg}
            active={visibleLayers[key]}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* Map */}
      <MapContainer center={[34.2, 1.8]} zoom={6} style={{ height, width: '100%', borderRadius: '0.5rem' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m, i) => (
          <Marker key={i} position={m.pos} icon={m.icon}>
            <Popup>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold">{m.label}</div>
                <div className="text-gray-600">{m.detail}</div>
                {m.sub && <div className="text-gray-500">{m.sub}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
