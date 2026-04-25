import { useEffect, useState, useCallback } from 'react'
import { getDashboard, getSources, getLots, getExceptions, getAlerts, getDepots, getLaveries, getTransformateurs, resetDemoData } from '../api'
import AlgeriaMap from '../components/AlgeriaMap'
import { SeverityBadge } from '../components/Badges'
import PageHeader from '../components/PageHeader'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const PIPELINE_LABELS = {
  collected:              'Collecté',
  awaiting_depot_receipt: 'Attente dépôt',
  at_depot:               'Au dépôt',
  classified:             'Classifié',
  in_transit_laundry:     'En transit laverie',
}

const PIPELINE_COLORS = ['#16a34a','#f59e0b','#3b82f6','#8b5cf6','#ef4444']

function KpiCard({ label, value, sub, color, tone = 'default', icon = '•' }) {
  const toneClass = {
    default: 'bg-white border-gray-200',
    brand: 'bg-brand-50 border-brand-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
  }[tone] || 'bg-white border-gray-200'

  return (
    <div className={`card p-5 border ${toneClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        <span className="text-lg leading-none" aria-hidden>{icon}</span>
      </div>
      <div className={`text-4xl font-extrabold leading-none ${color || 'text-gray-900'}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-500 mt-2">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary]   = useState(null)
  const [sources, setSources]   = useState([])
  const [lots, setLots]         = useState([])
  const [exceptions, setExceptions] = useState([])
  const [alerts, setAlerts]     = useState([])
  const [depots, setDepots]     = useState([])
  const [laveries, setLaveries] = useState([])
  const [transformateurs, setTransformateurs] = useState([])
  const [err, setErr]           = useState('')
  const [resetting, setResetting] = useState(false)

  const loadAll = useCallback(() => {
    setErr('')
    return Promise.all([
      getDashboard(), getSources(), getLots(), getExceptions(), getAlerts(),
      getDepots(), getLaveries(), getTransformateurs(),
    ])
      .then(([s, src, l, ex, al, dep, lav, trf]) => {
        setSummary(s); setSources(src); setLots(l); setExceptions(ex); setAlerts(al)
        setDepots(dep); setLaveries(lav); setTransformateurs(trf)
      })
      .catch(() => setErr('Impossible de charger le tableau de bord'))
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetDemoData()
      await loadAll()
    } catch {
      setErr('Échec du rechargement des données de démonstration.')
    } finally {
      setResetting(false)
    }
  }

  const pipelineData = summary
    ? Object.entries(summary.pipeline_weights).map(([k, v], i) => ({
        name: PIPELINE_LABELS[k] || k,
        kg: Math.round(v),
        fill: PIPELINE_COLORS[i % PIPELINE_COLORS.length],
      }))
    : []

  const recentAlerts = alerts.filter(a => !a.resolved_at).slice(0, 5)
  const unresolvedAlerts = alerts.filter(a => !a.resolved_at)
  const criticalAlerts = unresolvedAlerts.filter(a => a.severity === 'critical').length
  const warningAlerts = unresolvedAlerts.filter(a => a.severity === 'warning').length

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue temps réel de la chaîne NFN"
        action={
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-600 hover:border-brand-400 hover:text-brand-700 transition-colors disabled:opacity-50"
            title="Réinitialiser les données de démonstration"
          >
            <span className={resetting ? 'animate-spin inline-block' : ''}>🔄</span>
            {resetting ? 'Rechargement…' : 'Recharger données démo'}
          </button>
        }
      />

      {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{err}</div>}

      {!!summary?.unresolved_alerts && (
        <div className="mb-4 rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            Alerte supervision: {summary.unresolved_alerts} alerte(s) non traitée(s)
          </div>
          <div className="text-xs text-red-600 mt-1">
            Critiques: {criticalAlerts} · Avertissements: {warningAlerts}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Lots actifs" value={summary?.active_lots} color="text-brand-700" tone="brand" icon="📦" />
        <KpiCard
          label="Alertes non traitées"
          value={summary?.unresolved_alerts}
          color={summary?.unresolved_alerts > 0 ? 'text-red-700' : 'text-gray-900'}
          tone={summary?.unresolved_alerts > 0 ? 'danger' : 'default'}
          icon={summary?.unresolved_alerts > 0 ? '🚨' : '✅'}
          sub={summary?.unresolved_alerts > 0 ? `${criticalAlerts} critique(s) · ${warningAlerts} warning(s)` : 'Aucune alerte active'}
        />
        <KpiCard
          label="Sources en attente"
          value={summary?.pending_sources}
          color={summary?.pending_sources > 0 ? 'text-amber-700' : 'text-gray-900'}
          tone={summary?.pending_sources > 0 ? 'warning' : 'default'}
          icon="🐑"
        />
        <KpiCard
          label="BDC en retard"
          value={summary?.bdc_overdue}
          color={summary?.bdc_overdue > 0 ? 'text-red-700' : 'text-gray-900'}
          tone={summary?.bdc_overdue > 0 ? 'danger' : 'default'}
          icon="🚚"
        />
      </div>

      {/* Auto-alert check status */}
      <div className="flex items-center gap-2 mb-6 text-xs text-gray-500">
        <span className={`inline-block w-2 h-2 rounded-full ${summary?.last_alert_check_at ? 'bg-green-500' : 'bg-gray-300'}`} />
        {summary?.last_alert_check_at
          ? <>Dernière vérification automatique des alertes : <strong className="text-gray-700">{new Date(summary.last_alert_check_at).toLocaleString('fr-DZ')}</strong></>
          : 'Vérification automatique : en attente du premier cycle…'
        }
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Pipeline chart */}
        <div className="card p-4">
          <h2 className="font-medium text-gray-700 mb-3">Volume pipeline (kg)</h2>
          {pipelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineData} margin={{ top: 0, right: 8, bottom: 30, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [`${v} kg`]} />
                <Bar dataKey="kg" radius={[4,4,0,0]}>
                  {pipelineData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Aucune donnée</div>
          )}
        </div>

        {/* Recent alerts */}
        <div className="card p-4">
          <h2 className="font-medium text-gray-700 mb-3">Alertes actives récentes</h2>
          {recentAlerts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Aucune alerte active</div>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map(a => (
                <div key={a.alert_id} className="flex items-start gap-2 text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <SeverityBadge v={a.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{a.message}</div>
                    <div className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString('fr-DZ')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Algeria Map */}
      <div className="card p-4">
        <h2 className="font-medium text-gray-700 mb-3">Carte géographique — Algérie</h2>
        <p className="text-xs text-gray-400 mb-3">Cliquez sur un élément de la légende pour afficher / masquer la couche correspondante.</p>
        <AlgeriaMap
          sources={sources}
          lots={lots}
          exceptions={exceptions}
          depots={depots}
          laveries={laveries}
          transformateurs={transformateurs}
          height="440px"
        />
      </div>
    </div>
  )
}
