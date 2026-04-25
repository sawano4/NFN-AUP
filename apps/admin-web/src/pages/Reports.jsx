import { useEffect, useState } from 'react'
import { getSources, getLots, getAlerts, getShipments } from '../api'
import PageHeader from '../components/PageHeader'
import WILAYAS from '../data/wilayas'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function downloadCsv(filename, rows, headers) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [sources, setSources]   = useState([])
  const [lots, setLots]         = useState([])
  const [alerts, setAlerts]     = useState([])
  const [shipments, setShipments] = useState([])

  useEffect(() => {
    Promise.all([getSources(), getLots(), getAlerts(), getShipments()])
      .then(([s, l, a, sh]) => { setSources(s); setLots(l); setAlerts(a); setShipments(sh) })
      .catch(console.error)
  }, [])

  // Volume by wilaya
  const byWilaya = WILAYAS.map(w => {
    const wilayaSources = sources.filter(s => s.wilaya === w.name)
    const sourceIds = new Set(wilayaSources.map(s => s.public_id))
    const lotsHere = lots.filter(l => sourceIds.has(l.source_id))
    const kg = lotsHere.reduce((sum, l) => sum + (l.observed_weight_kg || 0), 0)
    return { wilaya: w.name, sources: wilayaSources.length, lots: lotsHere.length, kg: Math.round(kg) }
  }).filter(r => r.sources > 0 || r.lots > 0).sort((a, b) => b.kg - a.kg)

  // Alert stats
  const alertStats = {
    total: alerts.length,
    resolved: alerts.filter(a => a.resolved_at).length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
  }

  return (
    <div>
      <PageHeader title="Rapports" subtitle="Synthèse et exports" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ['Sources actives', sources.filter(s => s.status === 'active').length],
          ['Lots total', lots.length],
          ['Volume collecté (kg)', lots.reduce((s, l) => s + (l.observed_weight_kg || 0), 0).toFixed(0)],
          ['BDC émis', shipments.length],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-2xl font-bold text-brand-600">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Volume by wilaya chart */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-700">Volume collecté par wilaya (kg)</h2>
            <button className="btn-ghost text-xs" onClick={() => downloadCsv('rapport_wilayas.csv', byWilaya, ['wilaya','sources','lots','kg'])}>
              Export CSV
            </button>
          </div>
          {byWilaya.length === 0
            ? <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Aucune donnée</div>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byWilaya.slice(0, 15)} margin={{ top: 0, right: 8, bottom: 40, left: 0 }}>
                  <XAxis dataKey="wilaya" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="kg" fill="#16a34a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Alert stats */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-700">Statistiques alertes</h2>
            <button className="btn-ghost text-xs" onClick={() => downloadCsv('rapport_alertes.csv', alerts, ['alert_id','alert_type','severity','message','created_at','resolved_at'])}>
              Export CSV
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Total alertes', alertStats.total, 'text-gray-700'],
              ['Résolues', alertStats.resolved, 'text-green-600'],
              ['Critiques', alertStats.critical, 'text-red-600'],
              ['Avertissements', alertStats.warning, 'text-amber-600'],
            ].map(([l, v, c]) => (
              <div key={l} className="border rounded-lg p-3">
                <div className="text-xs text-gray-500">{l}</div>
                <div className={`text-2xl font-bold ${c}`}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wilaya breakdown table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-medium text-gray-700">Détail par wilaya</h2>
          <button className="btn-ghost text-xs" onClick={() => downloadCsv('rapport_detail_wilayas.csv', byWilaya, ['wilaya','sources','lots','kg'])}>
            Export CSV complet
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Wilaya','Sources actives','Lots','Volume (kg)'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {byWilaya.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Aucune donnée</td></tr>}
              {byWilaya.map(r => (
                <tr key={r.wilaya} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{r.wilaya}</td>
                  <td className="px-4 py-2 text-center">{r.sources}</td>
                  <td className="px-4 py-2 text-center">{r.lots}</td>
                  <td className="px-4 py-2 font-medium text-brand-600">{r.kg} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
