import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/',                 icon: '▣',  label: 'Tableau de bord' },
  { to: '/alerts',           icon: '⚡',  label: 'Alertes' },
  { to: '/sources',          icon: '🐑',  label: 'Sources' },
  { to: '/lots',             icon: '📦',  label: 'Lots' },
  { to: '/shipments',        icon: '🚚',  label: 'BDC / Expéditions' },
  { to: '/receipts',         icon: '📋',  label: 'Réceptions' },
  { to: '/classifications',  icon: '🏷',  label: 'Classifications' },
  { to: '/exceptions',       icon: '⚠',   label: 'Exceptions' },
  { to: '/documents',        icon: '📄',  label: 'Documents' },
  { to: '/depots',           icon: '🏭',  label: 'Dépôts' },
  { to: '/laveries',         icon: '🧺',  label: 'Laveries' },
  { to: '/transformateurs',  icon: '⚙️',  label: 'Transformateurs' },
  { to: '/users',            icon: '👥',  label: 'Utilisateurs' },
  { to: '/reports',          icon: '📊',  label: 'Rapports' },
  { to: '/settings',         icon: '⚙',   label: 'Paramètres' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  return (
    <aside className="w-56 flex-shrink-0 bg-brand-900 text-white flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-brand-700">
        <div className="text-lg font-bold tracking-tight">NFN Admin</div>
        <div className="text-xs text-brand-100 mt-0.5 truncate">{user?.email}</div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-brand-700 text-white font-medium' : 'text-brand-100 hover:bg-brand-800 hover:text-white'}`
            }
          >
            <span className="w-4 text-center text-base">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={logout}
        className="mx-4 mb-4 mt-2 btn-ghost text-sm border-brand-700 text-brand-100 hover:bg-brand-800 hover:text-white"
      >
        Déconnexion
      </button>
    </aside>
  )
}
