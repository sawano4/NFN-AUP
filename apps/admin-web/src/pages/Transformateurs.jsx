import { useEffect, useState } from 'react'
import { getTransformateurs, createTransformateur, updateTransformateur, deleteTransformateur } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import WILAYAS from '../data/wilayas'

const TYPES = ['T1', 'T2']

const EMPTY = {
  name: '', wilaya: '', commune: '',
  gps_lat: '', gps_lng: '',
  responsible_name: '', phone: '',
  type: 'T1',
}

function TransformateurForm({ init = EMPTY, onSubmit, onClose, loading }) {
  const [f, setF] = useState({ ...EMPTY, ...init })
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f) }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nom du transformateur</label>
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
          <label className="label">Type</label>
          <select className="input" value={f.type} onChange={set('type')}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
      </div>
    </form>
  )
}

const TYPE_COLORS = { T1: 'bg-cyan-100 text-cyan-800', T2: 'bg-indigo-100 text-indigo-800' }

export default function Transformateurs() {
  const [transformateurs, setTransformateurs] = useState([])
  const [search, setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading]   = useState(false)

  const load = () => getTransformateurs().then(setTransformateurs).catch(console.error)
  useEffect(() => { load() }, [])

  const visible = transformateurs.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.wilaya.toLowerCase().includes(q) || t.commune.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || t.type === typeFilter
    return matchSearch && matchType
  })

  const save = async data => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        gps_lat: Number(data.gps_lat) || 0,
        gps_lng: Number(data.gps_lng) || 0,
      }
      if (editing) await updateTransformateur(editing.transformateur_id, payload)
      else await createTransformateur(payload)
      setEditing(null); setCreating(false); load()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const doDelete = async () => {
    await deleteTransformateur(deleting.transformateur_id); setDeleting(null); load()
  }

  const countT1 = transformateurs.filter(t => t.type === 'T1').length
  const countT2 = transformateurs.filter(t => t.type === 'T2').length

  return (
    <div>
      <PageHeader
        title="Transformateurs"
        subtitle={`${transformateurs.length} transformateur${transformateurs.length !== 1 ? 's' : ''}`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nouveau transformateur</button>}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Total transformateurs</div>
          <div className="text-3xl font-bold text-brand-600">{transformateurs.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Type T1</div>
          <div className="text-3xl font-bold text-cyan-600">{countT1}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Type T2</div>
          <div className="text-3xl font-bold text-indigo-600">{countT2}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-wrap gap-3">
          <input
            className="input w-72"
            placeholder="Recherche nom / wilaya / commune…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input w-32" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Tous types</option>
            <option value="T1">T1</option>
            <option value="T2">T2</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['ID', 'Nom', 'Type', 'Wilaya', 'Commune', 'GPS', 'Responsable', 'Téléphone', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Aucun transformateur</td></tr>
              )}
              {visible.map(t => (
                <tr key={t.transformateur_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{t.transformateur_id}</td>
                  <td className="px-4 py-2 font-medium">{t.name}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLORS[t.type] || 'bg-gray-100 text-gray-700'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">{t.wilaya}</td>
                  <td className="px-4 py-2 text-gray-500">{t.commune}</td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-400 whitespace-nowrap">
                    {t.gps_lat?.toFixed(3)}, {t.gps_lng?.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{t.responsible_name}</td>
                  <td className="px-4 py-2 text-gray-500">{t.phone || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs" onClick={() => setEditing(t)}>Modifier</button>
                      <button className="btn-danger text-xs" onClick={() => setDeleting(t)}>Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && (
        <Modal title={editing ? 'Modifier le transformateur' : 'Nouveau transformateur'} onClose={() => { setCreating(false); setEditing(null) }} wide>
          <TransformateurForm init={editing || EMPTY} onSubmit={save} onClose={() => { setCreating(false); setEditing(null) }} loading={loading} />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          message={`Supprimer le transformateur "${deleting.name}" ?`}
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
