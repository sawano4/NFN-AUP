import { useEffect, useState } from 'react'
import { getExceptions, updateException, deleteException } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import AlgeriaMap from '../components/AlgeriaMap'

const REASONS = ['Absent','Refus','Météo','Route impraticable','Autre']

function EditModal({ item, onDone, onClose }) {
  const [f, setF] = useState({ ...item })
  const [loading, setLoading] = useState(false)
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  const submit = async e => {
    e.preventDefault(); setLoading(true)
    try { await updateException(f.exception_id, { reason: f.reason, note: f.note || null }); onDone() }
    catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }
  return (
    <Modal title="Modifier l'exception" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Motif</label>
          <select className="input" value={f.reason} onChange={set('reason')}>
            {REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="label">Note</label><textarea className="input" rows={3} value={f.note || ''} onChange={set('note')} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Exceptions() {
  const [items, setItems]       = useState([])
  const [tab, setTab]           = useState('list')
  const [editing, setEditing]   = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = () => getExceptions().then(setItems).catch(console.error)
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Exceptions terrain" subtitle={`${items.length} exception(s) signalée(s)`} />

      <div className="flex gap-4 mb-4 border-b border-gray-200">
        {[['list','Liste'],['map','Carte']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab===k ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
        ))}
      </div>

      {tab === 'map' && (
        <div className="card p-4">
          <AlgeriaMap exceptions={items} height="480px" />
        </div>
      )}

      {tab === 'list' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {['ID','Source ID','Motif','Note','GPS','Date','Actions'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune exception</td></tr>}
                {items.map(ex => (
                  <tr key={ex.exception_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{ex.exception_id}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{ex.source_id}</td>
                    <td className="px-4 py-2"><span className="badge-warn">{ex.reason}</span></td>
                    <td className="px-4 py-2 text-gray-500 text-xs max-w-[150px] truncate">{ex.note || '—'}</td>
                    <td className="px-4 py-2 text-xs font-mono text-gray-400">
                      {ex.gps?.lat ? `${ex.gps.lat.toFixed(3)}, ${ex.gps.lng?.toFixed(3)}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">{new Date(ex.created_at).toLocaleString('fr-DZ')}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button className="btn-ghost text-xs" onClick={() => setEditing(ex)}>Modifier</button>
                        <button className="btn-danger text-xs" onClick={() => setDeleting(ex)}>Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing  && <EditModal item={editing} onDone={() => { setEditing(null); load() }} onClose={() => setEditing(null)} />}
      {deleting && <ConfirmDialog message={`Supprimer l'exception "${deleting.exception_id}" ?`} onConfirm={async () => { await deleteException(deleting.exception_id); setDeleting(null); load() }} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
