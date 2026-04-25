import { useEffect, useState } from 'react'
import { getClassifications, updateClassification, deleteClassification } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

function EditModal({ item, onDone, onClose }) {
  const [f, setF] = useState({ ...item })
  const [loading, setLoading] = useState(false)
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  const submit = async e => {
    e.preventDefault(); setLoading(true)
    try { await updateClassification(f.lot_id, { classification: f.classification, vm_percent: Number(f.vm_percent), fiber_state: f.fiber_state, color: f.color }); onDone() }
    catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }
  return (
    <Modal title="Modifier la classification" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Lot ID</label><input className="input bg-gray-50" disabled value={f.lot_id} /></div>
        <div>
          <label className="label">Classe</label>
          <select className="input" value={f.classification} onChange={set('classification')}>
            {['A','B'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div><label className="label">VM% estimé</label><input className="input" type="number" step="0.1" value={f.vm_percent} onChange={set('vm_percent')} /></div>
        <div>
          <label className="label">État fibre</label>
          <select className="input" value={f.fiber_state} onChange={set('fiber_state')}>
            {['long','court','jarreuse'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Couleur</label>
          <select className="input" value={f.color} onChange={set('color')}>
            {['blanc','beige','tâché'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Classifications() {
  const [items, setItems]       = useState([])
  const [editing, setEditing]   = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = () => getClassifications().then(setItems).catch(console.error)
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Classifications" subtitle={`${items.length} lot(s) classifié(s)`} />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Lot ID','Classe','VM%','État fibre','Couleur','Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune classification</td></tr>}
              {items.map(c => (
                <tr key={c.lot_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-700">{c.lot_id}</td>
                  <td className="px-4 py-2">
                    <span className={c.classification === 'A' ? 'badge-ok' : 'badge-warn'}>Classe {c.classification}</span>
                  </td>
                  <td className="px-4 py-2">{c.vm_percent}%</td>
                  <td className="px-4 py-2 text-gray-500">{c.fiber_state}</td>
                  <td className="px-4 py-2 text-gray-500">{c.color}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs" onClick={() => setEditing(c)}>Modifier</button>
                      <button className="btn-danger text-xs" onClick={() => setDeleting(c)}>Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing  && <EditModal item={editing} onDone={() => { setEditing(null); load() }} onClose={() => setEditing(null)} />}
      {deleting && <ConfirmDialog message={`Supprimer la classification du lot "${deleting.lot_id}" ?`} onConfirm={async () => { await deleteClassification(deleting.lot_id); setDeleting(null); load() }} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
