import { useEffect, useState } from 'react'
import { getSources, createSource, updateSource, deleteSource, approveSource, rejectSource } from '../api'
import { StatusBadge } from '../components/Badges'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import AlgeriaMap from '../components/AlgeriaMap'
import WILAYAS from '../data/wilayas'

const RACES = ['Ouled Djellal','Hamra','Rembi','Berbère','Tazegzawt','Sidaou','Beni Ighil']
const SOURCE_TYPES = ['éleveur','abattoir','tiers']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const EMPTY = { email: '', source_type: 'éleveur', name: '', wilaya: '', commune: '', gps_lat: '', gps_lng: '', phone: '', races: [], herd_size: 0, availability_months: [] }

function SourceForm({ init = EMPTY, onSubmit, onClose, loading }) {
  const [f, setF] = useState({ ...EMPTY, ...init, gps_lat: init.gps_lat ?? '', gps_lng: init.gps_lng ?? '' })
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  const toggle = (key, val) => setF(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val] }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f) }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Nom</label>
          <input className="input" value={f.name} onChange={set('name')} required />
        </div>
        <div>
          <label className="label">Type de source</label>
          <select className="input" value={f.source_type} onChange={set('source_type')}>
            {SOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={f.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" value={f.phone || ''} onChange={set('phone')} />
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
          <label className="label">GPS Lat</label>
          <input className="input" type="number" step="any" value={f.gps_lat} onChange={set('gps_lat')} />
        </div>
        <div>
          <label className="label">GPS Lng</label>
          <input className="input" type="number" step="any" value={f.gps_lng} onChange={set('gps_lng')} />
        </div>
        <div>
          <label className="label">Cheptel (têtes)</label>
          <input className="input" type="number" min={0} value={f.herd_size} onChange={set('herd_size')} />
        </div>
      </div>
      <div>
        <label className="label">Races</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {RACES.map(r => (
            <label key={r} className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={f.races.includes(r)} onChange={() => toggle('races', r)} className="accent-brand-600" />
              {r}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Mois de disponibilité</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {MONTHS.map(m => (
            <label key={m} className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={f.availability_months.includes(m)} onChange={() => toggle('availability_months', m)} className="accent-brand-600" />
              {m}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
      </div>
    </form>
  )
}

function RejectModal({ source, onDone, onClose }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (reason.length < 3) return
    setLoading(true)
    try { await rejectSource(source.public_id, reason); onDone() }
    catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }
  return (
    <Modal title="Rejeter la source" onClose={onClose}>
      <p className="text-sm text-gray-600 mb-3">Source : <strong>{source.name}</strong></p>
      <label className="label">Motif de rejet</label>
      <textarea className="input mb-4" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn-danger" onClick={submit} disabled={loading || reason.length < 3}>Rejeter</button>
      </div>
    </Modal>
  )
}

export default function Sources() {
  const [sources, setSources]   = useState([])
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)
  const [rejecting, setRejecting] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState('list')

  const load = () => getSources().then(setSources).catch(console.error)
  useEffect(() => { load() }, [])

  const visible = sources.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.wilaya.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const pending = sources.filter(s => s.status === 'pending')

  const save = async data => {
    setLoading(true)
    try {
      if (editing) await updateSource(editing.public_id, data)
      else await createSource({ ...data, gps_lat: Number(data.gps_lat) || 0, gps_lng: Number(data.gps_lng) || 0 })
      setEditing(null); setCreating(false); load()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const approve = async s => {
    try { await approveSource(s.public_id, null); load() }
    catch (e) { alert(e.response?.data?.detail || e.message) }
  }

  const doDelete = async () => {
    await deleteSource(deleting.public_id); setDeleting(null); load()
  }

  return (
    <div>
      <PageHeader
        title="Sources"
        subtitle={`${sources.length} sources · ${pending.length} en attente`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nouvelle source</button>}
      />

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        {[['list','Liste'], ['map','Carte'], ['pending','En attente (' + pending.length + ')']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === k ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'map' && (
        <div className="card p-4">
          <AlgeriaMap sources={visible} height="500px" />
        </div>
      )}

      {tab === 'list' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b flex flex-wrap gap-3">
            <input className="input w-60" placeholder="Recherche nom / wilaya / email…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Tous statuts</option>
              <option value="pending">En attente</option>
              <option value="active">Actif</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {['Nom','Type','Wilaya','Commune','GPS','Races','Cheptel','Statut','Actions'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Aucune source</td></tr>}
                {visible.map(s => (
                  <tr key={s.public_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-gray-500">{s.source_type}</td>
                    <td className="px-4 py-2">{s.wilaya}</td>
                    <td className="px-4 py-2 text-gray-500">{s.commune}</td>
                    <td className="px-4 py-2 text-xs text-gray-400 font-mono whitespace-nowrap">
                      {s.gps_lat && s.gps_lng ? `${s.gps_lat.toFixed(3)}, ${s.gps_lng.toFixed(3)}` : <span className="text-amber-500">Wilaya</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-[120px] truncate">{s.races?.join(', ')}</td>
                    <td className="px-4 py-2 text-center">{s.herd_size}</td>
                    <td className="px-4 py-2"><StatusBadge v={s.status} /></td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {s.status === 'pending' && <>
                          <button className="btn-primary text-xs" onClick={() => approve(s)}>Valider</button>
                          <button className="btn-ghost text-xs text-red-600" onClick={() => setRejecting(s)}>Rejeter</button>
                        </>}
                        <button className="btn-ghost text-xs" onClick={() => setEditing(s)}>Modifier</button>
                        <button className="btn-danger text-xs" onClick={() => setDeleting(s)}>Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 && <div className="card p-8 text-center text-gray-400">Aucune source en attente</div>}
          {pending.map(s => (
            <div key={s.public_id} className="card p-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-1">
                <div className="font-semibold">{s.name} <span className="text-gray-400 font-normal text-sm">· {s.source_type}</span></div>
                <div className="text-sm text-gray-600">{s.wilaya}, {s.commune}</div>
                <div className="text-sm text-gray-500">{s.email} {s.phone && `· ${s.phone}`}</div>
                <div className="text-sm text-gray-500">Races : {s.races?.join(', ') || '—'} · Cheptel : {s.herd_size} têtes</div>
                <div className="text-xs text-gray-400">
                  GPS : {s.gps_lat && s.gps_lng ? `${s.gps_lat.toFixed(4)}, ${s.gps_lng.toFixed(4)}` : <span className="text-amber-500">non renseigné — wilaya utilisée comme repère</span>}
                </div>
                <div className="text-xs text-gray-400">Inscrit le : {new Date(s.created_at).toLocaleDateString('fr-DZ')}</div>
              </div>
              <div className="flex md:flex-col gap-2 items-start md:items-end justify-start md:justify-center shrink-0">
                <button className="btn-primary" onClick={() => approve(s)}>Valider</button>
                <button className="btn-ghost text-red-600 border-red-300" onClick={() => setRejecting(s)}>Rejeter</button>
                <button className="btn-ghost text-xs" onClick={() => setEditing(s)}>Modifier</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <Modal title={editing ? 'Modifier la source' : 'Nouvelle source'} onClose={() => { setCreating(false); setEditing(null) }} wide>
          <SourceForm init={editing || EMPTY} onSubmit={save} onClose={() => { setCreating(false); setEditing(null) }} loading={loading} />
        </Modal>
      )}
      {rejecting && <RejectModal source={rejecting} onDone={() => { setRejecting(null); load() }} onClose={() => setRejecting(null)} />}
      {deleting  && <ConfirmDialog message={`Supprimer la source "${deleting.name}" ?`} onConfirm={doDelete} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
