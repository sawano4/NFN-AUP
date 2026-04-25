export function SeverityBadge({ v }) {
  const cls = { critical: 'badge-crit', warning: 'badge-warn', info: 'badge-info' }[v] || 'badge-gray'
  const label = { critical: 'Critique', warning: 'Avertissement', info: 'Info' }[v] || v
  return <span className={cls}>{label}</span>
}

export function StatusBadge({ v }) {
  const map = {
    // Sources
    pending:                       ['badge-warn', 'En attente'],
    active:                        ['badge-ok',   'Actif'],
    rejected:                      ['badge-crit', 'Rejeté'],
    // Lots — original
    collected:                     ['badge-info', 'Collecté'],
    awaiting_depot_receipt:        ['badge-warn', 'Attente dépôt'],
    at_depot:                      ['badge-ok',   'Au dépôt'],
    classified:                    ['badge-ok',   'Classifié'],
    in_transit_laundry:            ['badge-gray', 'Transit → Laverie'],
    // Lots — extended chain
    at_laverie:                    ['badge-info', 'À la laverie'],
    laverie_done:                  ['badge-ok',   'Laverie ✓'],
    in_transit_transformateur:     ['badge-gray', 'Transit → Transfo'],
    at_transformateur:             ['badge-info', 'Au transformateur'],
    transformed:                   ['badge-ok',   'Transformé ✓'],
    // Misc
    resolved:                      ['badge-ok',   'Résolu'],
  }
  const [cls, label] = map[v] || ['badge-gray', v]
  return <span className={cls}>{label}</span>
}
