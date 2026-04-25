import { useEffect, useState } from 'react'
import { getReceipts, updateReceipt, deleteReceipt } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

function EditModal({ receipt, onDone, onClose }) {
  const [f, setF] = useState({ ...receipt })
  const [loading, setLoading] = useState(false)
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  const submit = async e => {
    e.preventDefault(); setLoading(true)
    try { await updateReceipt(f.lot_id, { received_weight_kg: Number(f.received_weight_kg), storage_zone: f.storage_zone, arrival_condition: f.arrival_condition, discrepancy_reason: f.discrepancy_reason || null }); onDone() }
    catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }
  return (
    <Modal title="Modifier la réception" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Lot ID</label><input className="input bg-gray-50" disabled value={f.lot_id} /></div>
        <div><label className="label">Poids reçu (kg)</label><input className="input" type="number" step="0.01" value={f.received_weight_kg} onChange={set('received_weight_kg')} required /></div>
        <div><label className="label">Zone de stockage</label><input className="input" value={f.storage_zone} onChange={set('storage_zone')} required /></div>
        <div>
          <label className="label">Condition à l'arrivée</label>
          <select className="input" value={f.arrival_condition} onChange={set('arrival_condition')}>
            {['correct','humide','endommagé'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div><label className="label">Motif d'écart</label><input className="input" value={f.discrepancy_reason || ''} onChange={set('discrepancy_reason')} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Receipts() {
  const [receipts, setReceipts] = useState([])
  const [editing, setEditing]   = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = () => getReceipts().then(setReceipts).catch(console.error)
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Réceptions dépôt" subtitle={`${receipts.length} réception(s)`} />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Lot ID','Poids reçu','Zone stockage','Condition','Motif écart','Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune réception</td></tr>}
              {receipts.map(r => (
                <tr key={r.lot_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-700">{r.lot_id}</td>
                  <td className="px-4 py-2">{r.received_weight_kg} kg</td>
                  <td className="px-4 py-2">{r.storage_zone}</td>
                  <td className="px-4 py-2">
                    <span className={r.arrival_condition === 'correct' ? 'badge-ok' : 'badge-warn'}>{r.arrival_condition}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{r.discrepancy_reason || '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs" onClick={() => setEditing(r)}>Modifier</button>
                      <button className="btn-danger text-xs" onClick={() => setDeleting(r)}>Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing  && <EditModal receipt={editing} onDone={() => { setEditing(null); load() }} onClose={() => setEditing(null)} />}
      {deleting && <ConfirmDialog message={`Supprimer la réception du lot "${deleting.lot_id}" ?`} onConfirm={async () => { await deleteReceipt(deleting.lot_id); setDeleting(null); load() }} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
