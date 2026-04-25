import { useEffect, useState } from 'react'
import { getShipments, deleteShipment } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

export default function Shipments() {
  const [items, setItems]       = useState([])
  const [deleting, setDeleting] = useState(null)

  const load = () => getShipments().then(setItems).catch(console.error)
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="BDC / Expéditions" subtitle={`${items.length} bon(s) de commande`} />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['BDC ID','Lots','Poids total','Humidité','Laverie','Statut','Livraison attendue','Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucun BDC</td></tr>}
              {items.map(s => (
                <tr key={s.bdc_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-700">{s.bdc_id}</td>
                  <td className="px-4 py-2 text-xs">{s.lot_ids?.length} lot(s)</td>
                  <td className="px-4 py-2">{s.total_weight_kg} kg</td>
                  <td className="px-4 py-2">{s.humidity_pct}%</td>
                  <td className="px-4 py-2">{s.laundry_name}</td>
                  <td className="px-4 py-2">
                    <span className={s.status === 'closed' ? 'badge-ok' : s.status === 'in_transit' ? 'badge-warn' : 'badge-info'}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400">
                    {s.expected_delivery_at ? new Date(s.expected_delivery_at).toLocaleString('fr-DZ') : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <button className="btn-danger text-xs" onClick={() => setDeleting(s)}>Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {deleting && <ConfirmDialog message={`Supprimer le BDC "${deleting.bdc_id}" ?`} onConfirm={async () => { await deleteShipment(deleting.bdc_id); setDeleting(null); load() }} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
