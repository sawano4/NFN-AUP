import { useEffect, useState } from 'react'
import { getLaveries, createLaverie, updateLaverie, deleteLaverie } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import WILAYAS from '../data/wilayas'

const EMPTY = {
  name: '', wilaya: '', commune: '',
  gps_lat: '', gps_lng: '',
  responsible_name: '', phone: '',
  cleaning_cost_per_kg_da: '',
}

function LaverieForm({ init = EMPTY, onSubmit, onClose, loading }) {
  const [f, setF] = useState({ ...EMPTY, ...init })
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f) }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nom de la laverie</label>
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
          <label className="label">
            Coût de lavage par kg (DA)
            <span className="ml-1 text-xs text-amber-600 font-normal">★ indicateur clé</span>
          </label>
          <input className="input" type="number" min={0} step="0.01" value={f.cleaning_cost_per_kg_da} onChange={set('cleaning_cost_per_kg_da')} required />
        </div>
      </div>
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
        <strong>Coût de lavage / kg</strong> — ce tarif est utilisé pour estimer le coût de traitement de la laine lors du calcul du coût total par kg (dépôt + lavage + transformation).
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
      </div>
    </form>
  )
}

export default function Laveries() {
  const [laveries, setLaveries] = useState([])
  const [search, setSearch]     = useState('')
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading]   = useState(false)

  const load = () => getLaveries().then(setLaveries).catch(console.error)
  useEffect(() => { load() }, [])

  const visible = laveries.filter(l => {
    const q = search.toLowerCase()
    return !q || l.name.toLowerCase().includes(q) || l.wilaya.toLowerCase().includes(q) || l.commune.toLowerCase().includes(q)
  })

  const save = async data => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        gps_lat: Number(data.gps_lat) || 0,
        gps_lng: Number(data.gps_lng) || 0,
        cleaning_cost_per_kg_da: Number(data.cleaning_cost_per_kg_da) || 0,
      }
      if (editing) await updateLaverie(editing.laverie_id, payload)
      else await createLaverie(payload)
      setEditing(null); setCreating(false); load()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const doDelete = async () => {
    await deleteLaverie(deleting.laverie_id); setDeleting(null); load()
  }

  const avgCost = laveries.length > 0
    ? (laveries.reduce((s, l) => s + (l.cleaning_cost_per_kg_da || 0), 0) / laveries.length).toFixed(2)
    : '—'

  return (
    <div>
      <PageHeader
        title="Laveries"
        subtitle={`${laveries.length} laverie${laveries.length !== 1 ? 's' : ''}`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nouvelle laverie</button>}
      />

      {/* Cost summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Nombre de laveries</div>
          <div className="text-3xl font-bold text-brand-600">{laveries.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Coût de lavage moyen / kg</div>
          <div className="text-2xl font-bold text-amber-600">{avgCost} <span className="text-base font-medium text-gray-500">DA / kg</span></div>
          <div className="text-xs text-gray-400 mt-1">Indicateur de coût de traitement</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Coût de lavage min / max</div>
          <div className="text-sm font-medium text-gray-700 mt-1">
            {laveries.length > 0 ? (
              <>
                <span className="text-green-600">{Math.min(...laveries.map(l => l.cleaning_cost_per_kg_da))} DA</span>
                <span className="text-gray-400 mx-2">→</span>
                <span className="text-red-600">{Math.max(...laveries.map(l => l.cleaning_cost_per_kg_da))} DA</span>
              </>
            ) : '—'}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <input
            className="input w-72"
            placeholder="Recherche nom / wilaya / commune…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['ID', 'Nom', 'Wilaya', 'Commune', 'GPS', 'Responsable', 'Téléphone', 'Coût lavage / kg', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Aucune laverie</td></tr>
              )}
              {visible.map(l => (
                <tr key={l.laverie_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{l.laverie_id}</td>
                  <td className="px-4 py-2 font-medium">{l.name}</td>
                  <td className="px-4 py-2">{l.wilaya}</td>
                  <td className="px-4 py-2 text-gray-500">{l.commune}</td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-400 whitespace-nowrap">
                    {l.gps_lat?.toFixed(3)}, {l.gps_lng?.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{l.responsible_name}</td>
                  <td className="px-4 py-2 text-gray-500">{l.phone || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <span className="font-semibold text-amber-600">{l.cleaning_cost_per_kg_da}</span>
                    <span className="text-xs text-gray-400 ml-1">DA / kg</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs" onClick={() => setEditing(l)}>Modifier</button>
                      <button className="btn-danger text-xs" onClick={() => setDeleting(l)}>Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && (
        <Modal title={editing ? 'Modifier la laverie' : 'Nouvelle laverie'} onClose={() => { setCreating(false); setEditing(null) }} wide>
          <LaverieForm init={editing || EMPTY} onSubmit={save} onClose={() => { setCreating(false); setEditing(null) }} loading={loading} />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          message={`Supprimer la laverie "${deleting.name}" ?`}
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
