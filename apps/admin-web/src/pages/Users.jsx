import { useEffect, useState } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

const ROLES = ['agent_collecteur','responsable_depot','admin_NFN','responsable_laverie','transformateur_T1','transformateur_T2']
const ROLE_LABELS = {
  agent_collecteur:    'Agent collecteur',
  responsable_depot:   'Resp. dépôt',
  admin_NFN:           'Admin NFN',
  responsable_laverie: 'Resp. laverie',
  transformateur_T1:   'Transformateur T1',
  transformateur_T2:   'Transformateur T2',
}

const EMPTY = { email: '', name: '', role: 'agent_collecteur', password: '' }

function UserForm({ init = EMPTY, onSubmit, onClose, loading, isEdit }) {
  const [f, setF] = useState({ ...EMPTY, ...init, password: '' })
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f) }} className="space-y-3">
      <div>
        <label className="label">Nom complet</label>
        <input className="input" value={f.name} onChange={set('name')} required />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={f.email} onChange={set('email')} required />
      </div>
      <div>
        <label className="label">Rôle</label>
        <select className="input" value={f.role} onChange={set('role')}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}</label>
        <input className="input" type="password" value={f.password} onChange={set('password')} {...(!isEdit && { required: true, minLength: 6 })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
      </div>
    </form>
  )
}

export default function Users() {
  const [users, setUsers]       = useState([])
  const [search, setSearch]     = useState('')
  const [roleFilter, setRole]   = useState('all')
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading]   = useState(false)

  const load = () => getUsers().then(setUsers).catch(console.error)
  useEffect(() => { load() }, [])

  const visible = users.filter(u => {
    const q = search.toLowerCase()
    const ms = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const mr = roleFilter === 'all' || u.role === roleFilter
    return ms && mr
  })

  const save = async data => {
    setLoading(true)
    try {
      const payload = { ...data }
      if (!payload.password) delete payload.password
      if (editing) await updateUser(editing.user_id, payload)
      else await createUser(payload)
      setEditing(null); setCreating(false); load()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const doDelete = async () => {
    await deleteUser(deleting.user_id); setDeleting(null); load()
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} compte(s) actif(s)`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nouvel utilisateur</button>}
      />

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-wrap gap-3">
          <input className="input w-56" placeholder="Recherche nom / email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-48" value={roleFilter} onChange={e => setRole(e.target.value)}>
            <option value="all">Tous les rôles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Nom','Email','Rôle','ID','Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun utilisateur</td></tr>}
              {visible.map(u => (
                <tr key={u.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 text-gray-500">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className="badge-info">{ROLE_LABELS[u.role] || u.role}</span>
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-400">{u.user_id}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs" onClick={() => setEditing(u)}>Modifier</button>
                      <button className="btn-danger text-xs" onClick={() => setDeleting(u)}>Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && (
        <Modal title={editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} onClose={() => { setCreating(false); setEditing(null) }}>
          <UserForm init={editing} onSubmit={save} onClose={() => { setCreating(false); setEditing(null) }} loading={loading} isEdit={!!editing} />
        </Modal>
      )}
      {deleting && <ConfirmDialog message={`Supprimer l'utilisateur "${deleting.name}" ?`} onConfirm={doDelete} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
