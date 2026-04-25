import { useEffect, useState } from 'react'
import { getThresholds, updateThresholds, getNotifications } from '../api'
import PageHeader from '../components/PageHeader'

export default function Settings() {
  const [thresholds, setThresholds] = useState(null)
  const [form, setForm]             = useState({})
  const [saved, setSaved]           = useState(false)
  const [loading, setLoading]       = useState(false)
  const [notifs, setNotifs]         = useState([])

  useEffect(() => {
    getThresholds().then(t => { setThresholds(t); setForm(t) }).catch(console.error)
    getNotifications().then(setNotifs).catch(console.error)
  }, [])

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const save = async e => {
    e.preventDefault(); setLoading(true); setSaved(false)
    try {
      const updated = await updateThresholds({
        estimate_gap_pct:            Number(form.estimate_gap_pct),
        receipt_gap_pct:             Number(form.receipt_gap_pct),
        bdc_overdue_hours:           Number(form.bdc_overdue_hours),
        laverie_transit_gap_pct:     Number(form.laverie_transit_gap_pct),
        laverie_overdue_hours:       Number(form.laverie_overdue_hours),
        depot_overdue_hours:         Number(form.depot_overdue_hours),
        alert_check_interval_minutes: Number(form.alert_check_interval_minutes),
      })
      setThresholds(updated); setForm(updated); setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Seuils d'alertes et configuration système" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thresholds */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Seuils d'alertes</h2>
          {!thresholds
            ? <div className="text-sm text-gray-400">Chargement…</div>
            : (
              <form onSubmit={save} className="space-y-4">
                <div>
                  <label className="label">Écart estimation → collecte (%)</label>
                  <div className="flex items-center gap-2">
                    <input className="input w-28" type="number" step="0.1" min={0} max={100}
                      value={form.estimate_gap_pct ?? ''} onChange={set('estimate_gap_pct')} />
                    <span className="text-sm text-gray-400">Si l'écart entre la pesée agent et l'estimation dépasse ce seuil → alerte</span>
                  </div>
                </div>
                <div>
                  <label className="label">Écart réception dépôt (%)</label>
                  <div className="flex items-center gap-2">
                    <input className="input w-28" type="number" step="0.1" min={0} max={100}
                      value={form.receipt_gap_pct ?? ''} onChange={set('receipt_gap_pct')} />
                    <span className="text-sm text-gray-400">Écart entre poids agent et poids reçu au dépôt</span>
                  </div>
                </div>
                <div>
                  <label className="label">Délai BDC en retard (heures)</label>
                  <div className="flex items-center gap-2">
                    <input className="input w-28" type="number" step="1" min={1}
                      value={form.bdc_overdue_hours ?? ''} onChange={set('bdc_overdue_hours')} />
                    <span className="text-sm text-gray-400">Après combien d'heures un BDC non clôturé est considéré en retard</span>
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Chaîne de traitement</p>
                </div>
                <div>
                  <label className="label">Écart de transit dépôt → laverie ou laverie → transfo. (%)</label>
                  <div className="flex items-center gap-2">
                    <input className="input w-28" type="number" step="0.1" min={0} max={100}
                      value={form.laverie_transit_gap_pct ?? ''} onChange={set('laverie_transit_gap_pct')} />
                    <span className="text-sm text-gray-400">Perte de poids tolérée entre deux maillons (transport) — au-delà : alerte critique</span>
                  </div>
                </div>
                <div>
                  <label className="label">Délai max. en laverie sans déclaration de fin (heures)</label>
                  <div className="flex items-center gap-2">
                    <input className="input w-28" type="number" step="1" min={1}
                      value={form.laverie_overdue_hours ?? ''} onChange={set('laverie_overdue_hours')} />
                    <span className="text-sm text-gray-400">Ex. 24h → alerte si le lot reste en laverie sans être déclaré prêt</span>
                  </div>
                </div>
                <div>
                  <label className="label">Délai max. en dépôt sans départ (heures)</label>
                  <div className="flex items-center gap-2">
                    <input className="input w-28" type="number" step="1" min={1}
                      value={form.depot_overdue_hours ?? ''} onChange={set('depot_overdue_hours')} />
                    <span className="text-sm text-gray-400">Ex. 48h → alerte si le lot reste au dépôt sans départ enregistré</span>
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vérification automatique</p>
                </div>
                <div>
                  <label className="label">Intervalle de vérification des alertes (minutes)</label>
                  <div className="flex items-center gap-2">
                    <input className="input w-28" type="number" step="1" min={1}
                      value={form.alert_check_interval_minutes ?? ''} onChange={set('alert_check_interval_minutes')} />
                    <span className="text-sm text-gray-400">Le serveur réévalue les conditions de retard toutes les N minutes en tâche de fond</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  {saved && <span className="text-sm text-green-600 font-medium">Seuils mis à jour ✓</span>}
                </div>
              </form>
            )}
        </div>

        {/* Notifications log */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Journal des notifications ({notifs.length})</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifs.length === 0
              ? <div className="text-sm text-gray-400">Aucune notification envoyée</div>
              : notifs.slice().reverse().map(n => (
                <div key={n.message_id} className="border rounded-lg p-3 text-xs">
                  <div className="font-medium text-gray-700">{n.subject}</div>
                  <div className="text-gray-500">À : {n.recipient}</div>
                  <div className="text-gray-400">{new Date(n.created_at).toLocaleString('fr-DZ')}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div className="card p-5 mt-6">
        <h2 className="font-semibold text-gray-800 mb-3">Services backend</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            ['Auth', '8101'],
            ['Sources', '8102'],
            ['Mobile', '8103'],
            ['Admin', '8104'],
            ['Opérateur', '8105'],
            ['Alertes', '8106'],
            ['Documents', '8107'],
            ['Notifications', '8108'],
          ].map(([name, port]) => (
            <div key={port} className="border rounded p-2 flex justify-between items-center">
              <span className="text-gray-600">{name}</span>
              <span className="font-mono text-brand-600">:{port}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
