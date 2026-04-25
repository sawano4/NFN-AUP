import { useEffect, useState } from 'react'
import { getDepots, createDepot, updateDepot, deleteDepot } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import WILAYAS from '../data/wilayas'

const EMPTY = {
  name: '', wilaya: '', commune: '',
  gps_lat: '', gps_lng: '',
  responsible_name: '', phone: '',
  surface_m2: '', location_cost_da_per_m2: '',
}

function DepotForm({ init = EMPTY, onSubmit, onClose, loading }) {
  const [f, setF] = useState({ ...EMPTY, ...init })
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  const totalCost = f.surface_m2 && f.location_cost_da_per_m2
    ? (Number(f.surface_m2) * Number(f.location_cost_da_per_m2)).toLocaleString('fr-DZ')
    : null

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f) }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nom du dépôt</label>
          <input className="input" value={f.name} onChange={set('name')} required />
        </div>
        <div>
          <label className="label">Wilaya</label>
          <select className="input" value={f.wilaya} onChange={set('wilaya')} required>
            <option value="">— Choisir —</option>
            {WILAYAS.map(w => <option key={w.code} value={w.name}>{w.code} · {w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Commune</label>
          <input className="input" value={f.commune} onChange={set('commune')} required />
        </div>
        <div>
          <label className="label">GPS Latitude</label>
          <input className="input" type="number" step="any" value={f.gps_lat} onChange={set('gps_lat')} required />
        </div>
        <div>
          <label className="label">GPS Longitude</label>
          <input className="input" type="number" step="any" value={f.gps_lng} onChange={set('gps_lng')} required />
        </div>
        <div className="col-span-2">
          <label className="label">Responsable</label>
          <input className="input" value={f.responsible_name} onChange={set('responsible_name')} required />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" value={f.phone || ''} onChange={set('phone')} />
        </div>
        <div>
          <label className="label">Surface (m²)</label>
          <input className="input" type="number" min={0} step="any" value={f.surface_m2} onChange={set('surface_m2')} required />
        </div>
        <div>
          <label className="label">Coût de location / m² / mois (DA)</label>
          <input className="input" type="number" min={0} step="0.01" value={f.location_cost_da_per_m2} onChange={set('location_cost_da_per_m2')} required />
        </div>
        {totalCost && (
          <div className="col-span-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            Coût mensuel total estimé : <strong>{totalCost} DA</strong>
            <span className="text-xs text-blue-500 ml-1">({f.surface_m2} m² × {f.location_cost_da_per_m2} DA/m²)</span>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
      </div>
    </form>
  )
}

export default function Depots() {
  const [depots, setDepots]     = useState([])
  const [search, setSearch]     = useState('')
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading]   = useState(false)

  const load = () => getDepots().then(setDepots).catch(console.error)
  useEffect(() => { load() }, [])

  const visible = depots.filter(d => {
    const q = search.toLowerCase()
    return !q || d.name.toLowerCase().includes(q) || d.wilaya.toLowerCase().includes(q) || d.commune.toLowerCase().includes(q)
  })

  const monthlyTotal = d => (d.surface_m2 || 0) * (d.location_cost_da_per_m2 || 0)
  const grandTotal   = depots.reduce((s, d) => s + monthlyTotal(d), 0)
  const totalSurface = depots.reduce((s, d) => s + (d.surface_m2 || 0), 0)

  const save = async data => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        gps_lat: Number(data.gps_lat) || 0,
        gps_lng: Number(data.gps_lng) || 0,
        surface_m2: Number(data.surface_m2) || 0,
        location_cost_da_per_m2: Number(data.location_cost_da_per_m2) || 0,
      }
      if (editing) await updateDepot(editing.depot_id, payload)
      else await createDepot(payload)
      setEditing(null); setCreating(false); load()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const doDelete = async () => {
    await deleteDepot(deleting.depot_id); setDeleting(null); load()
  }

  return (
    <div>
      <PageHeader
        title="Dépôts"
        subtitle={`${depots.length} dépôt${depots.length !== 1 ? 's' : ''}`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nouveau dépôt</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Nombre de dépôts</div>
          <div className="text-3xl font-bold text-brand-600">{depots.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Surface totale</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalSurface.toLocaleString('fr-DZ')} <span className="text-base font-medium text-gray-500">m²</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Coût location mensuel total</div>
          <div className="text-2xl font-bold text-gray-900">
            {grandTotal.toLocaleString('fr-DZ')} <span className="text-base font-medium text-gray-500">DA</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">Σ (surface × tarif/m²)</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <input className="input w-72" placeholder="Recherche nom / wilaya / commune…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['ID','Nom','Wilaya','Commune','GPS','Responsable','Tél.','Surface (m²)','Tarif / m²','Coût mensuel','Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Aucun dépôt</td></tr>}
              {visible.map(d => (
                <tr key={d.depot_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{d.depot_id}</td>
                  <td className="px-4 py-2 font-medium">{d.name}</td>
                  <td className="px-4 py-2">{d.wilaya}</td>
                  <td className="px-4 py-2 text-gray-500">{d.commune}</td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-400 whitespace-nowrap">{d.gps_lat?.toFixed(3)}, {d.gps_lng?.toFixed(3)}</td>
                  <td className="px-4 py-2 text-gray-600">{d.responsible_name}</td>
                  <td className="px-4 py-2 text-gray-500">{d.phone || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{d.surface_m2?.toLocaleString('fr-DZ')}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{d.location_cost_da_per_m2} <span className="text-xs text-gray-400">DA</span></td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-blue-700">
                    {monthlyTotal(d).toLocaleString('fr-DZ')} <span className="text-xs font-normal text-gray-400">DA</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs" onClick={() => setEditing(d)}>Modifier</button>
                      <button className="btn-danger text-xs" onClick={() => setDeleting(d)}>Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && (
        <Modal title={editing ? 'Modifier le dépôt' : 'Nouveau dépôt'} onClose={() => { setCreating(false); setEditing(null) }} wide>
          <DepotForm init={editing || EMPTY} onSubmit={save} onClose={() => { setCreating(false); setEditing(null) }} loading={loading} />
        </Modal>
      )}
      {deleting && <ConfirmDialog message={`Supprimer le dépôt "${deleting.name}" ?`} onConfirm={doDelete} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
