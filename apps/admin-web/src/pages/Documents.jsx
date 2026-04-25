import { useEffect, useState } from 'react'
import { getDocuments, createDocument, updateDocument, deleteDocument } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

const KINDS = ['generic','bdc','certificat_purete','qr_code']

function DocForm({ init, onSubmit, onClose, loading }) {
  const [f, setF] = useState({ title: '', kind: 'generic', ...init, lines: (init?.lines || []).join('\n') })
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...f, lines: f.lines.split('\n').filter(Boolean) }) }} className="space-y-3">
      <div><label className="label">Titre</label><input className="input" value={f.title} onChange={set('title')} required /></div>
      <div>
        <label className="label">Type</label>
        <select className="input" value={f.kind} onChange={set('kind')}>
          {KINDS.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>
      <div><label className="label">Contenu (une ligne par entrée)</label><textarea className="input font-mono text-xs" rows={6} value={f.lines} onChange={set('lines')} /></div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn-primary" disabled={loading}>Enregistrer</button>
      </div>
    </form>
  )
}

export default function Documents() {
  const [docs, setDocs]         = useState([])
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading]   = useState(false)

  const load = () => getDocuments().then(setDocs).catch(console.error)
  useEffect(() => { load() }, [])

  const save = async data => {
    setLoading(true)
    try {
      if (editing) await updateDocument(editing.document_id, data)
      else await createDocument(data)
      setEditing(null); setCreating(false); load()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${docs.length} document(s)`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nouveau document</button>}
      />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['ID','Titre','Type','Lignes','PDF','Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun document</td></tr>}
              {docs.map(d => (
                <tr key={d.document_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{d.document_id}</td>
                  <td className="px-4 py-2 font-medium">{d.title}</td>
                  <td className="px-4 py-2"><span className="badge-info">{d.kind}</span></td>
                  <td className="px-4 py-2 text-gray-500">{d.lines?.length || 0}</td>
                  <td className="px-4 py-2">
                    {d.pdf_url && (
                      <a href={d.pdf_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-xs">Télécharger</a>
                    )}
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
        <Modal title={editing ? 'Modifier le document' : 'Nouveau document'} onClose={() => { setCreating(false); setEditing(null) }}>
          <DocForm init={editing} onSubmit={save} onClose={() => { setCreating(false); setEditing(null) }} loading={loading} />
        </Modal>
      )}
      {deleting && <ConfirmDialog message={`Supprimer "${deleting.title}" ?`} onConfirm={async () => { await deleteDocument(deleting.document_id); setDeleting(null); load() }} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
