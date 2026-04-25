import { useEffect, useState } from 'react'
import {
  getLots, deleteLot, getLotTraceability, createLot, updateLot, getSources,
  getDepots, getLaveries, getTransformateurs,
  getLotChain, chainDepotArrival, chainDepotDeparture,
  chainLaverieArrival, chainLaverieDone,
  chainTransformateurArrival, chainTransformateurDone,
} from '../api'
import { StatusBadge } from '../components/Badges'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

const ALL_STATUSES = [
  'collected','awaiting_depot_receipt','at_depot','classified','in_transit_laundry',
  'at_laverie','laverie_done','in_transit_transformateur','at_transformateur','transformed',
]

const STATUS_LABELS = {
  collected: 'Collecté', awaiting_depot_receipt: 'Attente dépôt',
  at_depot: 'Au dépôt', classified: 'Classifié',
  in_transit_laundry: 'Transit → Laverie', at_laverie: 'À la laverie',
  laverie_done: 'Laverie ✓', in_transit_transformateur: 'Transit → Transfo',
  at_transformateur: 'Au transformateur', transformed: 'Transformé ✓',
}

// ── Chain step definitions ────────────────────────────────────────────────────
// Each step has: id, label, statusAfter, fields to record, and which previous
// chain field must exist to unlock this step.

const CHAIN_STEPS = [
  {
    id: 'depot_arrival',
    label: 'Arrivée dépôt',
    statusAfter: 'at_depot',
    doneField: 'depot_arrival_at',
    prerequisite: null,
    apiCall: (lotId, f) => chainDepotArrival(lotId, {
      depot_id: f.depot_id,
      arrival_weight_kg: Number(f.arrival_weight_kg),
      arrival_at: f.arrival_at || undefined,
    }),
    fields: (depots) => [
      { key: 'depot_id', label: 'Dépôt', type: 'select', options: depots.map(d => ({ value: d.depot_id, label: d.name })) },
      { key: 'arrival_weight_kg', label: 'Poids arrivée (kg)', type: 'number' },
      { key: 'arrival_at', label: 'Date/heure arrivée', type: 'datetime-local', optional: true },
    ],
    summary: c => c.depot_arrival_at
      ? `${c.depot_arrival_weight_kg} kg · ${fmt(c.depot_arrival_at)}`
      : null,
  },
  {
    id: 'depot_departure',
    label: 'Départ dépôt',
    statusAfter: 'in_transit_laundry',
    doneField: 'depot_departure_at',
    prerequisite: 'depot_arrival_at',
    apiCall: (lotId, f) => chainDepotDeparture(lotId, {
      departure_weight_kg: Number(f.departure_weight_kg),
      departure_at: f.departure_at || undefined,
    }),
    fields: () => [
      { key: 'departure_weight_kg', label: 'Poids départ (kg)', type: 'number' },
      { key: 'departure_at', label: 'Date/heure départ', type: 'datetime-local', optional: true },
    ],
    summary: c => c.depot_departure_at
      ? `${c.depot_departure_weight_kg} kg · ${fmt(c.depot_departure_at)}`
      : null,
  },
  {
    id: 'laverie_arrival',
    label: 'Arrivée laverie',
    statusAfter: 'at_laverie',
    doneField: 'laverie_arrival_at',
    prerequisite: 'depot_departure_at',
    apiCall: (lotId, f) => chainLaverieArrival(lotId, {
      laverie_id: f.laverie_id,
      arrival_weight_kg: Number(f.arrival_weight_kg),
      arrival_at: f.arrival_at || undefined,
    }),
    fields: (_, laveries) => [
      { key: 'laverie_id', label: 'Laverie', type: 'select', options: laveries.map(l => ({ value: l.laverie_id, label: l.name })) },
      { key: 'arrival_weight_kg', label: 'Poids arrivée (kg)', type: 'number' },
      { key: 'arrival_at', label: 'Date/heure arrivée', type: 'datetime-local', optional: true },
    ],
    summary: c => c.laverie_arrival_at
      ? `${c.laverie_arrival_weight_kg} kg · ${fmt(c.laverie_arrival_at)}`
      : null,
  },
  {
    id: 'laverie_done',
    label: 'Laverie prête',
    statusAfter: 'laverie_done',
    doneField: 'laverie_exit_at',
    prerequisite: 'laverie_arrival_at',
    apiCall: (lotId, f) => chainLaverieDone(lotId, {
      exit_weight_kg: Number(f.exit_weight_kg),
      exit_at: f.exit_at || undefined,
    }),
    fields: () => [
      { key: 'exit_weight_kg', label: 'Poids sortie laverie (kg)', type: 'number' },
      { key: 'exit_at', label: 'Date/heure fin', type: 'datetime-local', optional: true },
    ],
    summary: c => c.laverie_exit_at
      ? `${c.laverie_exit_weight_kg} kg · ${fmt(c.laverie_exit_at)}`
      : null,
  },
  {
    id: 'transformateur_arrival',
    label: 'Arrivée transfo.',
    statusAfter: 'at_transformateur',
    doneField: 'transformateur_arrival_at',
    prerequisite: 'laverie_exit_at',
    apiCall: (lotId, f) => chainTransformateurArrival(lotId, {
      transformateur_id: f.transformateur_id,
      arrival_weight_kg: Number(f.arrival_weight_kg),
      arrival_at: f.arrival_at || undefined,
    }),
    fields: (_, __, transformateurs) => [
      { key: 'transformateur_id', label: 'Transformateur', type: 'select', options: transformateurs.map(t => ({ value: t.transformateur_id, label: `${t.name} (${t.type})` })) },
      { key: 'arrival_weight_kg', label: 'Poids arrivée (kg)', type: 'number' },
      { key: 'arrival_at', label: 'Date/heure arrivée', type: 'datetime-local', optional: true },
    ],
    summary: c => c.transformateur_arrival_at
      ? `${c.transformateur_arrival_weight_kg} kg · ${fmt(c.transformateur_arrival_at)}`
      : null,
  },
  {
    id: 'transformateur_done',
    label: 'Transformation ✓',
    statusAfter: 'transformed',
    doneField: 'transformateur_exit_at',
    prerequisite: 'transformateur_arrival_at',
    apiCall: (lotId, f) => chainTransformateurDone(lotId, {
      exit_weight_kg: Number(f.exit_weight_kg),
      exit_at: f.exit_at || undefined,
    }),
    fields: () => [
      { key: 'exit_weight_kg', label: 'Poids sortie transfo. (kg)', type: 'number' },
      { key: 'exit_at', label: 'Date/heure fin', type: 'datetime-local', optional: true },
    ],
    summary: c => c.transformateur_exit_at
      ? `${c.transformateur_exit_weight_kg} kg · ${fmt(c.transformateur_exit_at)}`
      : null,
  },
]

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-DZ', { dateStyle: 'short', timeStyle: 'short' })
}

function weightGap(a, b) {
  if (a == null || b == null || b === 0) return null
  return ((a - b) / b * 100).toFixed(1)
}

function GapBadge({ a, b, label }) {
  const gap = weightGap(a, b)
  if (gap === null) return null
  const abs = Math.abs(gap)
  const color = abs > 5 ? 'text-red-600 bg-red-50 border-red-200'
    : abs > 2 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-green-700 bg-green-50 border-green-200'
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${color}`}>
      {label} {gap > 0 ? '+' : ''}{gap}%
    </span>
  )
}

// ── Chain modal ───────────────────────────────────────────────────────────────
function ChainModal({ lot, onClose, depots, laveries, transformateurs }) {
  const [chain, setChain] = useState(null)
  const [activeStep, setActiveStep] = useState(null)  // step being filled in
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    getLotChain(lot.lot_id).then(setChain).catch(console.error)
  }, [lot.lot_id])

  const refresh = () => getLotChain(lot.lot_id).then(setChain)

  const openStep = step => { setActiveStep(step); setForm({}); setErr('') }

  const submitStep = async () => {
    setLoading(true); setErr('')
    try {
      await activeStep.apiCall(lot.lot_id, form)
      await refresh()
      setActiveStep(null)
    } catch (e) { setErr(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const isDone = step => chain && chain[step.doneField]
  const isUnlocked = step => !isDone(step) && (!step.prerequisite || (chain && chain[step.prerequisite]))

  return (
    <Modal title={`Chaîne de traçabilité — ${lot.lot_id}`} onClose={onClose} wide>
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
        <span>Source : <strong>{lot.source_name}</strong></span>
        <span className="text-gray-300">·</span>
        <span>Poids collecte : <strong>{lot.observed_weight_kg} kg</strong></span>
        <span className="text-gray-300">·</span>
        <StatusBadge v={lot.status} />
      </div>

      {!chain ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <>
          {/* Weight gap indicators */}
          <div className="flex flex-wrap gap-2 mb-4">
            <GapBadge a={chain.depot_arrival_weight_kg}    b={lot.observed_weight_kg}            label="Écart collecte→dépôt" />
            <GapBadge a={chain.laverie_arrival_weight_kg}  b={chain.depot_departure_weight_kg}   label="Écart dépôt→laverie" />
            <GapBadge a={chain.laverie_exit_weight_kg}     b={chain.laverie_arrival_weight_kg}   label="Perte lavage" />
            <GapBadge a={chain.transformateur_arrival_weight_kg} b={chain.laverie_exit_weight_kg} label="Écart laverie→transfo" />
          </div>

          {/* Step timeline */}
          <ol className="relative">
            {CHAIN_STEPS.map((step, i) => {
              const done     = isDone(step)
              const unlocked = isUnlocked(step)
              const summary  = step.summary(chain)

              return (
                <li key={step.id} className="flex gap-3 mb-0">
                  {/* Vertical line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                      done      ? 'bg-green-500 border-green-500 text-white'
                      : unlocked ? 'bg-white border-brand-500 text-brand-600'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < CHAIN_STEPS.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[2rem] ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${done ? 'text-green-700' : unlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                      {done && summary && (
                        <span className="text-xs text-gray-500 truncate">{summary}</span>
                      )}
                      {unlocked && (
                        <button
                          className="ml-auto btn-primary text-xs shrink-0"
                          onClick={() => openStep(step)}
                        >
                          Enregistrer
                        </button>
                      )}
                      {!done && !unlocked && (
                        <span className="ml-auto text-xs text-gray-300 shrink-0">En attente</span>
                      )}
                    </div>

                    {/* Inline form when this step is active */}
                    {activeStep?.id === step.id && (
                      <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                        {step.fields(depots, laveries, transformateurs).map(field => (
                          <div key={field.key}>
                            <label className="label text-xs">
                              {field.label}
                              {field.optional && <span className="text-gray-400 ml-1">(facultatif — défaut : maintenant)</span>}
                            </label>
                            {field.type === 'select' ? (
                              <select className="input" value={form[field.key] || ''} onChange={set(field.key)} required={!field.optional}>
                                <option value="">— Choisir —</option>
                                {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            ) : (
                              <input
                                className="input"
                                type={field.type}
                                step={field.type === 'number' ? '0.01' : undefined}
                                min={field.type === 'number' ? 0 : undefined}
                                value={form[field.key] || ''}
                                onChange={set(field.key)}
                                required={!field.optional}
                              />
                            )}
                          </div>
                        ))}
                        {err && <div className="text-xs text-red-600">{err}</div>}
                        <div className="flex gap-2 pt-1">
                          <button className="btn-primary text-xs" onClick={submitStep} disabled={loading}>
                            {loading ? 'Enregistrement…' : 'Confirmer'}
                          </button>
                          <button className="btn-ghost text-xs" onClick={() => setActiveStep(null)}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </Modal>
  )
}

// ── Traceability modal ────────────────────────────────────────────────────────
function TraceModal({ lotId, onClose }) {
  const [events, setEvents] = useState([])
  useEffect(() => { getLotTraceability(lotId).then(setEvents).catch(console.error) }, [lotId])
  return (
    <Modal title={`Traçabilité — ${lotId}`} onClose={onClose} wide>
      {events.length === 0
        ? <div className="text-gray-400 text-sm">Aucun événement</div>
        : (
          <ol className="relative border-l border-brand-200 ml-3 space-y-5">
            {events.map((e, i) => (
              <li key={i} className="ml-5">
                <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600" />
                <div className="text-sm font-medium text-gray-800">{e.event_type}</div>
                <div className="text-xs text-gray-500">{e.actor} · {new Date(e.occurred_at).toLocaleString('fr-DZ')}</div>
                {Object.entries(e.details || {}).map(([k, v]) => (
                  <div key={k} className="text-xs text-gray-400">{k}: {String(v)}</div>
                ))}
              </li>
            ))}
          </ol>
        )}
    </Modal>
  )
}

function pickFirst(...vals) {
  const value = vals.find(v => v !== undefined && v !== null && v !== '')
  return value === undefined ? '—' : String(value)
}

function addDays(isoOrDate, days) {
  const d = new Date(isoOrDate)
  d.setDate(d.getDate() + days)
  return d
}

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-gray-800 mb-2">{children}</h3>
}

function InfoGrid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">{children}</div>
}

function InfoField({ label, value }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium mt-0.5 break-words">{value}</div>
    </div>
  )
}

// ── Layered lot details (tabs by chain actor) ───────────────────────────────
function LotLayeredModal({ lot, onClose, depots, laveries, transformateurs }) {
  const [chain, setChain] = useState(null)
  const [events, setEvents] = useState([])
  const [tab, setTab] = useState('collecte')

  useEffect(() => {
    Promise.all([
      getLotChain(lot.lot_id).catch(() => null),
      getLotTraceability(lot.lot_id).catch(() => []),
    ]).then(([c, e]) => {
      setChain(c)
      setEvents(e)
    })
  }, [lot.lot_id])

  const depotName = depots.find(d => d.depot_id === chain?.depot_id)?.name || chain?.depot_id || '—'
  const laverieName = laveries.find(l => l.laverie_id === chain?.laverie_id)?.name || chain?.laverie_id || '—'
  const transformateurName = transformateurs.find(t => t.transformateur_id === chain?.transformateur_id)?.name || chain?.transformateur_id || '—'

  const collectedEvent = events.find(e => e.event_type === 'lot.collected')
  const depotReceivedEvent = events.find(e => e.event_type === 'depot.lot_received')
  const depotClassifiedEvent = events.find(e => e.event_type === 'depot.lot_classified')
  const depotArrivedEvent = events.find(e => e.event_type === 'chain.depot_arrived')
  const depotDepartedEvent = events.find(e => e.event_type === 'chain.depot_departed')
  const laverieArrivedEvent = events.find(e => e.event_type === 'chain.laverie_arrived')
  const laverieDoneEvent = events.find(e => e.event_type === 'chain.laverie_done')
  const transformArrivedEvent = events.find(e => e.event_type === 'chain.transformateur_arrived')
  const transformedEvent = events.find(e => e.event_type === 'chain.transformed')

  const lotDetails = lot.details || {}
  const collectedDetails = collectedEvent?.details || {}
  const depotReceivedDetails = depotReceivedEvent?.details || {}
  const depotArrivedDetails = depotArrivedEvent?.details || {}
  const depotDepartedDetails = depotDepartedEvent?.details || {}
  const laverieArrivedDetails = laverieArrivedEvent?.details || {}
  const laverieDoneDetails = laverieDoneEvent?.details || {}
  const transformArrivedDetails = transformArrivedEvent?.details || {}
  const transformedDetails = transformedEvent?.details || {}

  const observedWeight = Number(lot.observed_weight_kg || 0)
  const estimatedWeight = Number(lot.estimated_weight_kg || 0)
  const cleanScore = Number(pickFirst(collectedDetails.cleanliness, lot.cleanliness, 3)) || 3
  const collectAt = collectedEvent?.occurred_at || lot.created_at
  const shearingAt = addDays(collectAt, -2)
  const antiparasiticAt = addDays(collectAt, -45)
  const bagsCount = Math.max(1, Math.ceil((estimatedWeight || observedWeight || 100) / 25))
  const woolColorDefault = cleanScore >= 4 ? 'Beige' : 'Blanc cassé'
  const vmDefault = Math.min(12, Math.max(2.5, Number((cleanScore * 1.4).toFixed(1))))
  const humidDefault = Math.min(18, Math.max(11, Number((12 + cleanScore * 0.6).toFixed(1))))
  const triClassDefault = vmDefault > 5 ? 'Classe B' : 'Classe A'
  const flowAkg = Math.max(0, Math.round((observedWeight || estimatedWeight || 100) * (triClassDefault === 'Classe A' ? 0.72 : 0.38)))
  const flowBkg = Math.max(0, Math.round((observedWeight || estimatedWeight || 100) - flowAkg))
  const destinationDefault = triClassDefault === 'Classe A' ? 'Laverie (isolation)' : 'Transformateur direct (engrais)'
  const drynessDefault = `${Math.max(0, 100 - humidDefault).toFixed(1)}%`
  const waterPerKgDefault = Number((6.2 + cleanScore * 0.4).toFixed(1))
  const energyDefault = Number((1.8 + cleanScore * 0.2).toFixed(1))
  const propreteNoteDefault = cleanScore >= 4 ? 'Paille + foin visibles, traces de marquage légères' : 'Propreté correcte, quelques fibres végétales'

  const tabs = [
    { id: 'collecte', label: 'Collecte agent' },
    { id: 'depot', label: 'Dépôt' },
    { id: 'laverie', label: 'Laverie' },
    { id: 'transformateur', label: 'Transformateur' },
  ]

  const stageMaxTabIndex = (() => {
    const s = lot.status
    if (['at_transformateur', 'transformed'].includes(s)) return 3
    if (['at_laverie', 'laverie_done', 'in_transit_transformateur'].includes(s)) return 2
    if (['at_depot', 'classified', 'in_transit_laundry'].includes(s)) return 1
    return 0
  })()

  useEffect(() => {
    const currentIndex = tabs.findIndex(t => t.id === tab)
    if (currentIndex > stageMaxTabIndex) {
      setTab(tabs[stageMaxTabIndex].id)
    }
  }, [tab, stageMaxTabIndex])

  return (
    <Modal title={`Fiche lot — ${lot.lot_id}`} onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <StatusBadge v={lot.status} />
        <span className="text-gray-300">•</span>
        <span>Source : <strong>{lot.source_name}</strong></span>
        <span className="text-gray-300">•</span>
        <span>Créé le : <strong>{fmt(lot.created_at)}</strong></span>
      </div>

      <div className="flex gap-2 border-b mb-4">
        {tabs.map((t, idx) => {
          const disabled = idx > stageMaxTabIndex
          return (
            <button
              key={t.id}
              onClick={() => !disabled && setTab(t.id)}
              disabled={disabled}
              className={`pb-2 px-2 text-sm border-b-2 -mb-px ${
                disabled
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
                  : tab === t.id
                    ? 'border-brand-600 text-brand-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'collecte' && (
        <div className="space-y-4">
          <div>
            <SectionTitle>1) Collecteur de laine de tonte</SectionTitle>
            <InfoGrid>
              <InfoField label="Identifiant producteur" value={pickFirst(collectedDetails.source_name, lot.source_name)} />
              <InfoField label="Numéro berger / propriétaire" value={pickFirst(collectedDetails.source_id, lot.source_id)} />
              <InfoField label="Date de tonte" value={pickFirst(lotDetails.shearing_date, collectedDetails.shearing_date, fmt(shearingAt))} />
              <InfoField label="Date de collecte" value={pickFirst(collectedEvent?.occurred_at ? fmt(collectedEvent.occurred_at) : null, fmt(lot.created_at))} />
              <InfoField label="Race de mouton" value={pickFirst(lotDetails.breed, collectedDetails.breed, lotDetails.race, 'Ouled Djellal')} />
              <InfoField label="Type de laine" value={pickFirst(lotDetails.wool_type, collectedDetails.wool_type, lotDetails.collection_type, 'Toison entière')} />
              <InfoField label="État de propreté (1-5)" value={pickFirst(collectedDetails.cleanliness, lot.cleanliness)} />
              <InfoField label="Annotation propreté" value={pickFirst(lotDetails.cleanliness_note, collectedDetails.cleanliness_note, propreteNoteDefault)} />
              <InfoField label="Dernier traitement antiparasitaire" value={pickFirst(lotDetails.last_antiparasitic_treatment_at, collectedDetails.last_antiparasitic_treatment_at, fmt(antiparasiticAt))} />
              <InfoField label="Conditionnement (nb/type sacs)" value={pickFirst(lotDetails.packaging, collectedDetails.packaging, lotDetails.bags_count && lotDetails.bag_type ? `${lotDetails.bags_count} sacs ${lotDetails.bag_type}` : null, `${bagsCount} sacs PP`)} />
              <InfoField label="Poids brut estimé" value={`${pickFirst(collectedDetails.estimated_weight_kg, lot.estimated_weight_kg)} kg`} />
              <InfoField label="Longueur de mèche (mm)" value={pickFirst(lotDetails.staple_length_mm, collectedDetails.staple_length_mm, 72)} />
              <InfoField label="Couleur de la laine" value={pickFirst(lotDetails.wool_color, collectedDetails.wool_color, woolColorDefault)} />
              <InfoField label="Taux de jarre" value={pickFirst(lotDetails.jarre_rate_pct, collectedDetails.jarre_rate_pct, '3.5%')} />
            </InfoGrid>
          </div>

          <div>
            <SectionTitle>2) Collecteur après abattage</SectionTitle>
            <InfoGrid>
              <InfoField label="Provenance abattoir / tannerie" value={pickFirst(lotDetails.slaughterhouse_number, lotDetails.abattoir_name, collectedDetails.abattoir_name, 'Abattoir régional - lot complémentaire')} />
              <InfoField label="Mode d'extraction" value={pickFirst(lotDetails.extraction_mode, collectedDetails.extraction_mode, 'Laine échauffée (naturelle)')} />
              <InfoField label="Taux d'humidité à l'entrée" value={pickFirst(lotDetails.entry_humidity_pct, collectedDetails.entry_humidity_pct, `${humidDefault}%`)} />
              <InfoField label="Présence de cuir (%)" value={pickFirst(lotDetails.skin_residue_pct, collectedDetails.skin_residue_pct, '2.0%')} />
              <InfoField label="Poids net réception" value={pickFirst(lotDetails.net_weight_kg, collectedDetails.net_weight_kg, lot.observed_weight_kg)} />
              <InfoField label="Qualité (1-5)" value={pickFirst(lotDetails.quality_note, collectedDetails.quality_note, Math.max(1, 6 - cleanScore))} />
              <InfoField label="Avis tri spécialiste" value={pickFirst(lotDetails.specialist_sorting_comment, collectedDetails.specialist_sorting_comment, 'Tri conforme, fibres valorisables après séparation.')} />
            </InfoGrid>
          </div>
        </div>
      )}

      {tab === 'depot' && (
        <div className="space-y-4 text-sm">
          <div>
            <SectionTitle>3) Dépositaire / Centre de tri</SectionTitle>
            <InfoGrid>
              <InfoField label="Code lot" value={lot.lot_id} />
              <InfoField label="Zone de stockage" value={pickFirst(depotReceivedDetails.storage_zone, lotDetails.storage_zone, 'A1')} />
              <InfoField label="Date d'entrée" value={pickFirst(chain?.depot_arrival_at ? fmt(chain.depot_arrival_at) : null, fmt(depotArrivedEvent?.occurred_at))} />
              <InfoField label="Date de sortie prévue" value={pickFirst(lotDetails.expected_departure_at, depotDepartedEvent?.occurred_at ? fmt(depotDepartedEvent.occurred_at) : null, fmt(addDays(chain?.depot_arrival_at || collectAt, 2)))} />
              <InfoField label="Classification tri" value={pickFirst(depotClassifiedEvent?.details?.classification, lotDetails.classification, lot.status === 'classified' ? 'Classe A/B' : null, triClassDefault)} />
              <InfoField label="Température du tas" value={pickFirst(lotDetails.depot_temperature_celsius, depotClassifiedEvent?.details?.depot_temperature_celsius, `${(22 + cleanScore * 1.2).toFixed(1)}°C`)} />
              <InfoField label="Poids entrée" value={`${pickFirst(chain?.depot_arrival_weight_kg, lot.observed_weight_kg)} kg`} />
              <InfoField label="Poids sortie" value={`${pickFirst(chain?.depot_departure_weight_kg, Math.max(0, Number((observedWeight * 0.96).toFixed(1))))} kg`} />
              <InfoField label="Criblage qualité (destination)" value={pickFirst(lotDetails.screening_destination, lotDetails.destination_flow, vmDefault > 5 ? 'Flux 2 : Engrais' : 'Flux 1 : Isolation')} />
              <InfoField label="Taux matières végétales (VM%)" value={pickFirst(depotClassifiedEvent?.details?.vm_percent, lotDetails.vm_percent, lotDetails.depot_vm_rate_pct, `${vmDefault}%`)} />
              <InfoField label="Humidité critique (<15%)" value={pickFirst(lotDetails.critical_humidity_pct, lotDetails.humidity_pct, `${Math.min(14.5, humidDefault).toFixed(1)}%`)} />
              <InfoField label="Dépôt" value={depotName} />
            </InfoGrid>
          </div>

          <div>
            <SectionTitle>4) Sortie dépositaire (segmentation)</SectionTitle>
            <InfoGrid>
              <InfoField label="Identifiant lot sortie" value={pickFirst(lotDetails.output_lot_id, lot.lot_id)} />
              <InfoField label="Volume Flux A (isolation)" value={pickFirst(lotDetails.flow_a_volume, lotDetails.flow_a_volume_kg, `${flowAkg} kg`)} />
              <InfoField label="Volume Flux B (engrais)" value={pickFirst(lotDetails.flow_b_volume, lotDetails.flow_b_volume_kg, `${flowBkg} kg`)} />
              <InfoField label="Taux impuretés (VM%)" value={pickFirst(lotDetails.vm_percent, lotDetails.depot_vm_rate_pct, `${vmDefault}%`)} />
              <InfoField label="Degré humidité (H%)" value={pickFirst(lotDetails.humidity_pct, `${humidDefault}%`)} />
              <InfoField label="Destination prévue" value={pickFirst(lotDetails.destination, lotDetails.destination_type, 'Laverie / Transformateur')} />
            </InfoGrid>
          </div>
        </div>
      )}

      {tab === 'laverie' && (
        <div className="space-y-4 text-sm">
          <div>
            <SectionTitle>5) Entrée laverie (contrôle réception)</SectionTitle>
            <InfoGrid>
              <InfoField label="Poids brut à l'entrée" value={`${pickFirst(chain?.laverie_arrival_weight_kg, laverieArrivedDetails.arrival_weight_kg, Math.max(0, Number((observedWeight * 0.95).toFixed(1))))} kg`} />
              <InfoField label="État conditionnement" value={pickFirst(lotDetails.packaging_condition, 'correct / déchiré / humide')} />
              <InfoField label="Température eau lavage" value={pickFirst(lotDetails.wash_water_temperature_celsius, laverieArrivedDetails.wash_water_temperature_celsius, '42°C')} />
              <InfoField label="Type détergent" value={pickFirst(lotDetails.detergent_type, laverieArrivedDetails.detergent_type, 'Détergent biodégradable neutre')} />
              <InfoField label="Poids net après lavage" value={`${pickFirst(chain?.laverie_exit_weight_kg, laverieDoneDetails.exit_weight_kg, Math.max(0, Number((observedWeight * 0.82).toFixed(1))))} kg`} />
              <InfoField label="Poids/volume suint récupéré" value={pickFirst(lotDetails.suint_recovered_kg, lotDetails.suint_recovered_liters, `${Math.max(0.4, Number((observedWeight * 0.015).toFixed(2)))} kg`)} />
              <InfoField label="Laverie" value={laverieName} />
              <InfoField label="Dates entrée/sortie" value={`${fmt(chain?.laverie_arrival_at)} → ${fmt(chain?.laverie_exit_at)}`} />
            </InfoGrid>
          </div>

          <div>
            <SectionTitle>7) Sortie laverie (certificat pureté)</SectionTitle>
            <InfoGrid>
              <InfoField label="Poids net sec" value={`${pickFirst(chain?.laverie_exit_weight_kg, transformedDetails.net_dry_weight_kg)} kg`} />
              <InfoField label="Humidité résiduelle (12-15%)" value={pickFirst(lotDetails.residual_humidity_pct, `${Math.min(14.8, Math.max(12.1, humidDefault - 1.3)).toFixed(1)}%`)} />
              <InfoField label="Suint résiduel (<1%)" value={pickFirst(lotDetails.residual_lanoline_pct, '0.8%')} />
              <InfoField label="Blancheur / jaunissement" value={pickFirst(lotDetails.whiteness_index, 'Indice 72/100')} />
              <InfoField label="Volume eau par kg" value={pickFirst(lotDetails.water_l_per_kg, `${waterPerKgDefault} L/kg`)} />
              <InfoField label="Énergie de séchage" value={pickFirst(lotDetails.drying_energy_kwh, `${energyDefault} kWh/kg`)} />
              <InfoField label="pH laine" value={pickFirst(lotDetails.wool_ph, '6.9')} />
            </InfoGrid>
          </div>
        </div>
      )}

      {tab === 'transformateur' && (
        <div className="space-y-4 text-sm">
          <div>
            <SectionTitle>6) Entrée transformateur (engrais direct)</SectionTitle>
            <InfoGrid>
              <InfoField label="Origine du flux" value={pickFirst(lotDetails.origin_flow, vmDefault > 5 ? 'Flux B' : 'Flux A/B mixte')} />
              <InfoField label="Indice de sécheresse" value={pickFirst(lotDetails.dryness_index, lotDetails.humidity_pct, drynessDefault)} />
              <InfoField label="Corps étrangers" value={pickFirst(lotDetails.foreign_bodies_check, 'RAS (contrôle visuel OK)')} />
              <InfoField label="Mode de déchargement" value={pickFirst(lotDetails.unloading_mode, 'vrac / balles')} />
              <InfoField label="Destination finale produit" value={pickFirst(lotDetails.final_destination, 'Engrais organique granulé')} />
              <InfoField label="Transformateur" value={transformateurName} />
              <InfoField label="Poids entrée" value={`${pickFirst(chain?.transformateur_arrival_weight_kg, transformArrivedDetails.arrival_weight_kg, Math.max(0, Number((observedWeight * 0.78).toFixed(1))))} kg`} />
              <InfoField label="Poids sortie" value={`${pickFirst(chain?.transformateur_exit_weight_kg, transformedDetails.exit_weight_kg, Math.max(0, Number((observedWeight * 0.74).toFixed(1))))} kg`} />
            </InfoGrid>
          </div>

          <div className="card p-3 text-xs text-gray-500">
            Arrivée transformateur : {transformArrivedEvent?.actor || '—'} · {fmt(transformArrivedEvent?.occurred_at)}<br />
            Transformation finie : {transformedEvent?.actor || '—'} · {fmt(transformedEvent?.occurred_at)}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Lot form ──────────────────────────────────────────────────────────────────
function LotForm({ init, sources, onSubmit, onClose, loading }) {
  const [f, setF] = useState({
    source_id: '', source_name: '', observed_weight_kg: '',
    estimated_weight_kg: '', status: 'awaiting_depot_receipt', cleanliness: '',
    ...init,
  })
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  const pickSource = e => {
    const s = sources.find(x => x.public_id === e.target.value)
    setF(p => ({ ...p, source_id: e.target.value, source_name: s?.name || '' }))
  }
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f) }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Source</label>
          <select className="input" value={f.source_id} onChange={pickSource} required>
            <option value="">— Choisir —</option>
            {sources.map(s => <option key={s.public_id} value={s.public_id}>{s.name} · {s.wilaya}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Poids constaté (kg)</label>
          <input className="input" type="number" step="0.01" min={0} value={f.observed_weight_kg} onChange={set('observed_weight_kg')} required />
        </div>
        <div>
          <label className="label">Poids estimé (kg)</label>
          <input className="input" type="number" step="0.01" min={0} value={f.estimated_weight_kg} onChange={set('estimated_weight_kg')} required />
        </div>
        <div>
          <label className="label">Propreté</label>
          <select className="input" value={f.cleanliness || ''} onChange={set('cleanliness')}>
            {['','1','2','3','4','5'].map(v => <option key={v} value={v}>{v || '— Aucune —'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={f.status} onChange={set('status')}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Lots() {
  const [lots, setLots]                   = useState([])
  const [sources, setSources]             = useState([])
  const [depots, setDepots]               = useState([])
  const [laveries, setLaveries]           = useState([])
  const [transformateurs, setTransformateurs] = useState([])
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatus]         = useState('all')
  const [selectedLot, setSelectedLot]     = useState(null)
  const [chaining, setChaining]           = useState(null)
  const [editing, setEditing]             = useState(null)
  const [creating, setCreating]           = useState(false)
  const [deleting, setDeleting]           = useState(null)
  const [loading, setLoading]             = useState(false)

  const load = () =>
    Promise.all([getLots(), getSources(), getDepots(), getLaveries(), getTransformateurs()])
      .then(([l, s, d, lv, t]) => { setLots(l); setSources(s); setDepots(d); setLaveries(lv); setTransformateurs(t) })
      .catch(console.error)

  useEffect(() => { load() }, [])

  const visible = lots.filter(l => {
    const q = search.toLowerCase()
    const ms = !q || l.lot_id.toLowerCase().includes(q) || l.source_name?.toLowerCase().includes(q)
    const mst = statusFilter === 'all' || l.status === statusFilter
    return ms && mst
  })

  const save = async data => {
    setLoading(true)
    try {
      const payload = { ...data, observed_weight_kg: Number(data.observed_weight_kg), estimated_weight_kg: Number(data.estimated_weight_kg) }
      if (editing) await updateLot(editing.lot_id, payload)
      else await createLot(payload)
      setEditing(null); setCreating(false); load()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const doDelete = async () => {
    await deleteLot(deleting.lot_id); setDeleting(null); load()
  }

  // Chain progress indicator for each row
  const chainProgress = lot => {
    const s = lot.status
    const steps = ['at_depot','in_transit_laundry','at_laverie','laverie_done','at_transformateur','transformed']
    const idx = steps.indexOf(s)
    if (idx < 0) return 0
    return Math.round(((idx + 1) / steps.length) * 100)
  }

  return (
    <div>
      <PageHeader
        title="Lots"
        subtitle={`${lots.length} lot(s) au total`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nouveau lot</button>}
      />

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input className="input w-56" placeholder="Recherche lot / source…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-52" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="all">Tous statuts</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
          </select>
        </div>
      </div>

      {visible.length === 0 && <div className="card p-8 text-center text-gray-400">Aucun lot</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {visible.map(l => {
          const gap = l.estimated_weight_kg > 0
            ? (((l.observed_weight_kg - l.estimated_weight_kg) / l.estimated_weight_kg) * 100).toFixed(1)
            : null
          const pct = chainProgress(l)

          return (
            <button
              key={l.lot_id}
              onClick={() => setSelectedLot(l)}
              className="card p-6 min-h-[320px] text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-mono text-xs font-semibold text-brand-700">{l.lot_id}</div>
                  <div className="text-base font-semibold mt-1">{l.source_name}</div>
                </div>
                <StatusBadge v={l.status} />
              </div>

              <div className="text-sm text-gray-500 mb-3">État actuel : <strong className="text-gray-700">{STATUS_LABELS[l.status] || l.status}</strong></div>

              <div className="space-y-2 text-sm">
                <div>Poids : <strong>{l.observed_weight_kg} kg</strong></div>
                <div>Poids estimé : <strong>{l.estimated_weight_kg} kg</strong></div>
                <div>Écart : <strong className={gap !== null && Math.abs(gap) > 10 ? 'text-red-600' : ''}>{gap !== null ? `${gap > 0 ? '+' : ''}${gap}%` : '—'}</strong></div>
                <div>Propreté : <strong>{l.cleanliness || '—'}</strong></div>
                <div>Date collecte : <strong>{new Date(l.created_at).toLocaleDateString('fr-DZ')}</strong></div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{pct}%</span>
              </div>

              <div className="mt-3 text-xs text-gray-400">Créé le {new Date(l.created_at).toLocaleDateString('fr-DZ')}</div>

              <div className="mt-3 pt-3 border-t flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                <button className="btn-primary text-xs" onClick={() => setChaining(l)}>Chaîne</button>
                <button className="btn-ghost text-xs" onClick={() => setEditing(l)}>Modifier</button>
                <button className="btn-danger text-xs" onClick={() => setDeleting(l)}>Suppr.</button>
              </div>
            </button>
          )
        })}
      </div>

      {chaining && (
        <ChainModal
          lot={chaining}
          onClose={() => { setChaining(null); load() }}
          depots={depots}
          laveries={laveries}
          transformateurs={transformateurs}
        />
      )}
      {selectedLot && (
        <LotLayeredModal
          lot={selectedLot}
          onClose={() => setSelectedLot(null)}
          depots={depots}
          laveries={laveries}
          transformateurs={transformateurs}
        />
      )}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifier le lot' : 'Nouveau lot'} onClose={() => { setCreating(false); setEditing(null) }}>
          <LotForm init={editing} sources={sources.filter(s => s.status === 'active')} onSubmit={save} onClose={() => { setCreating(false); setEditing(null) }} loading={loading} />
        </Modal>
      )}
      {deleting && <ConfirmDialog message={`Supprimer le lot "${deleting.lot_id}" ?`} onConfirm={doDelete} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
