import { useEffect, useState } from 'react'
import { getAlerts, resolveAlert, deleteAlert, createAlert } from '../api'
import { SeverityBadge } from '../components/Badges'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

const TYPES = ['estimate_gap','receipt_gap','bdc_overdue']
const SEVERITIES = ['info','warning','critical']

function ResolveModal({ alert, onDone, onClose }) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (!comment.trim()) return
    setLoading(true)
    try { await resolveAlert(alert.alert_id, comment); onDone() }
    catch (e) { alert('Erreur: ' + (e.response?.data?.detail || e.message)) }
    finally { setLoading(false) }
  }
  return (
    <Modal title="Marquer comme traité" onClose={onClose}>
      <p className="text-sm text-gray-600 mb-3"><strong>{alert.message}</strong></p>
      <label className="label">Commentaire obligatoire</label>
      <textarea className="input mb-4" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={submit} disabled={loading || !comment.trim()}>Valider</button>
      </div>
    </Modal>
  )
}

function CreateModal({ onDone, onClose }) {
  const [form, setForm] = useState({ alert_type: 'estimate_gap', severity: 'warning', message: '', actors: '' })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const submit = async () => {
    setLoading(true)
    try {
      await createAlert({ ...form, actors: form.actors ? form.actors.split(',').map(s => s.trim()) : [] })
      onDone()
    } catch (e) { alert('Erreur: ' + (e.response?.data?.detail || e.message)) }
    finally { setLoading(false) }
  }
  return (
    <Modal title="Créer une alerte manuelle" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.alert_type} onChange={set('alert_type')}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Sévérité</label>
          <select className="input" value={form.severity} onChange={set('severity')}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Message</label>
          <input className="input" value={form.message} onChange={set('message')} />
        </div>
        <div>
          <label className="label">Acteurs (emails séparés par virgule)</label>
          <input className="input" value={form.actors} onChange={set('actors')} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={submit} disabled={loading || !form.message.trim()}>Créer</button>
      </div>
    </Modal>
  )
}

export default function Alerts() {
  const [alerts, setAlerts]   = useState([])
  const [filter, setFilter]   = useState('all')
  const [resolving, setResolving] = useState(null)
  const [creating, setCreating]   = useState(false)
  const [deleting, setDeleting]   = useState(null)

  const load = () => getAlerts().then(setAlerts).catch(console.error)
  useEffect(() => { load() }, [])

  const visible = filter === 'all' ? alerts
    : filter === 'active'   ? alerts.filter(a => !a.resolved_at)
    : alerts.filter(a => a.severity === filter)

  const doDelete = async () => {
    await deleteAlert(deleting.alert_id)
    setDeleting(null)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Alertes"
        subtitle={`${alerts.filter(a => !a.resolved_at).length} alerte(s) non traitée(s)`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nouvelle alerte</button>}
      />

      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="px-4 py-3 border-b flex flex-wrap gap-2">
          {['all','active','critical','warning','info'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'all' ? 'Toutes' : f === 'active' ? 'Non traitées' : f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Sévérité','Type','Message','Lot','Acteurs','Date','Statut','Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune alerte</td></tr>
              )}
              {visible.map(a => (
                <tr key={a.alert_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2"><SeverityBadge v={a.severity} /></td>
                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{a.alert_type}</td>
                  <td className="px-4 py-2 max-w-xs truncate">{a.message}</td>
                  <td className="px-4 py-2 text-gray-500 font-mono text-xs">{a.lot_id || '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 max-w-[120px] truncate">{a.actors?.join(', ') || '—'}</td>
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap text-xs">{new Date(a.created_at).toLocaleString('fr-DZ')}</td>
                  <td className="px-4 py-2">
                    {a.resolved_at
                      ? <span className="badge-ok">Traité</span>
                      : <span className="badge-warn">En cours</span>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {!a.resolved_at && (
                        <button className="btn-ghost text-xs" onClick={() => setResolving(a)}>Traiter</button>
                      )}
                      <button className="btn-danger text-xs" onClick={() => setDeleting(a)}>Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {resolving && <ResolveModal alert={resolving} onDone={() => { setResolving(null); load() }} onClose={() => setResolving(null)} />}
      {creating  && <CreateModal onDone={() => { setCreating(false); load() }} onClose={() => setCreating(false)} />}
      {deleting  && <ConfirmDialog message={`Supprimer l'alerte "${deleting.message}" ?`} onConfirm={doDelete} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
