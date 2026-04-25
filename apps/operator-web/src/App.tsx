import { FormEvent, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { Fragment } from 'react';
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileText,
  Flame,
  LogOut,
  PackageCheck,
  RefreshCw,
  Route,
  ScanLine,
  ShieldCheck,
  Truck,
  UserRound,
  Waves,
} from 'lucide-react';
import { AlertRecord, api, BdcRecord, demoUsers, OperatorSite, PolicyStatus, QrScanResult, Role, StockLot, Tokens, TraceabilityEvent, UserProfile } from './api';

type View = 'depot' | 'laundry' | 'transformer' | 'admin';

type DashboardData = {
  pending: StockLot[];
  stock: StockLot[];
  incomingLaundry: BdcRecord[];
  incomingTransformer: BdcRecord[];
  bdcs: BdcRecord[];
  openBdcs: BdcRecord[];
  alerts: AlertRecord[];
  sites: OperatorSite[];
  users: UserProfile[];
  policies: PolicyStatus | null;
};

const emptyData: DashboardData = {
  pending: [],
  stock: [],
  incomingLaundry: [],
  incomingTransformer: [],
  bdcs: [],
  openBdcs: [],
  alerts: [],
  sites: [],
  users: [],
  policies: null,
};

const roleLabels: Record<Role, string> = {
  agent_collecteur: 'Agent collecteur',
  responsable_depot: 'Responsable depot',
  responsable_laverie: 'Responsable laverie',
  transformateur_T1: 'Transformateur T1',
  transformateur_T2: 'Transformateur T2',
  admin_NFN: 'Admin NFN',
};

const statusLabels: Record<string, string> = {
  awaiting_depot_receipt: 'Attente depot',
  at_depot: 'Au depot',
  classified: 'Classe',
  in_transit_laundry: 'Transit laverie',
  at_laundry: 'En laverie',
  washed: 'Lave',
  in_transit_transformer: 'Transit transformateur',
  delivered: 'Livre',
  issued: 'Emis',
  closed: 'Cloture',
};

function getDefaultView(role: Role): View {
  if (role === 'responsable_depot') return 'depot';
  if (role === 'responsable_laverie') return 'laundry';
  if (role === 'transformateur_T1' || role === 'transformateur_T2') return 'transformer';
  return 'admin';
}

function kg(value: number | undefined | null): string {
  return `${Number(value ?? 0).toLocaleString('fr-DZ', { maximumFractionDigits: 1 })} kg`;
}

function pct(value: number | undefined | null): string {
  return `${Number(value ?? 0).toLocaleString('fr-DZ', { maximumFractionDigits: 1 })}%`;
}

function when(value: string): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function hoursUntil(value: string): number {
  return (new Date(value).getTime() - Date.now()) / 3_600_000;
}

function canAccess(role: Role, view: View): boolean {
  if (role === 'admin_NFN') return true;
  if (view === 'depot') return role === 'responsable_depot';
  if (view === 'laundry') return role === 'responsable_laverie';
  if (view === 'transformer') return role === 'transformateur_T1' || role === 'transformateur_T2';
  return false;
}

export default function App() {
  const [tokens, setTokens] = useState<Tokens | null>(() => {
    const stored = localStorage.getItem('nfn-operator-tokens');
    return stored ? (JSON.parse(stored) as Tokens) : null;
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>('depot');
  const [data, setData] = useState<DashboardData>(emptyData);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokens) return;
    api.me(tokens.access_token)
      .then((profile) => {
        setUser(profile);
        setView(getDefaultView(profile.role));
      })
      .catch(() => {
        setTokens(null);
        localStorage.removeItem('nfn-operator-tokens');
      });
  }, [tokens]);

  useEffect(() => {
    if (!tokens || !user) return;
    void refreshData();
  }, [tokens, user, view]);

  async function run<T>(label: string, task: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await task();
      setMessage(label);
      await refreshData();
      return result;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action impossible');
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function refreshData() {
    if (!tokens || !user) return;
    const token = tokens.access_token;
    const next: DashboardData = { ...emptyData };
    const safe = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => promise.catch(() => fallback);

    if (canAccess(user.role, 'depot')) {
      next.pending = await safe(api.pendingReceipts(token), []);
      next.stock = await safe(api.depotStock(token), []);
    }
    if (canAccess(user.role, 'laundry')) {
      next.incomingLaundry = await safe(api.incomingLaundry(token), []);
    }
    if (canAccess(user.role, 'transformer')) {
      next.incomingTransformer = await safe(api.incomingTransformer(token), []);
    }
    next.openBdcs = await safe(api.openBdcs(token), []);
    next.bdcs = await safe(api.bdcs(token), []);
    next.sites = await safe(api.sites(token), []);
    next.policies = await safe(api.policies(token), null);
    if (user.role === 'admin_NFN') {
      next.alerts = await safe(api.alerts(token), []);
      next.users = await safe(api.users(token), []);
    }
    setData(next);
  }

  async function login(email: string, password: string) {
    setBusy(true);
    setError('');
    try {
      const nextTokens = await api.login(email, password);
      localStorage.setItem('nfn-operator-tokens', JSON.stringify(nextTokens));
      setTokens(nextTokens);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setTokens(null);
    setUser(null);
    localStorage.removeItem('nfn-operator-tokens');
  }

  async function seedDemoLot() {
    await run('Lot terrain de demo synchronise', async () => {
      const agentTokens = await api.login('agent@nfn.example.com', 'agent123');
      const bootstrap = await api.mobileBootstrap(agentTokens.access_token);
      const lotId = bootstrap.reserved_lot_ids[0];
      return api.mobileSync(agentTokens.access_token, {
        jobs: [
          {
            client_job_id: `operator-demo-${Date.now()}`,
            job_type: 'lot_collected',
            occurred_at: new Date().toISOString(),
            payload: {
              lot_id: lotId,
              source_id: 'SRC-2026-001',
              source_name: 'Ferme Ouled Djellal',
              observed_weight_kg: 92,
              estimated_weight_kg: 95,
              cleanliness: 'propre',
              gps: { lat: 34.154, lng: 3.503 },
            },
          },
        ],
      });
    });
  }

  async function downloadReport() {
    await run('Rapport CSV exporte', async () => {
      const csv = await api.reportCsv(tokens!.access_token, view);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nfn-${view}-report.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return csv;
    });
  }

  if (!tokens || !user) {
    return <LoginScreen busy={busy} error={error} onLogin={login} />;
  }

  const allowedTabs = [
    { id: 'depot' as View, label: 'Depot', icon: Boxes },
    { id: 'laundry' as View, label: 'Laverie', icon: Waves },
    { id: 'transformer' as View, label: 'Transformation', icon: Factory },
    { id: 'admin' as View, label: 'Supervision', icon: ShieldCheck },
  ].filter((tab) => canAccess(user.role, tab.id));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">NFN</div>
          <div>
            <p className="eyebrow">Operator Console</p>
            <h1>Flux laine</h1>
          </div>
        </div>
        <div className="user-card">
          <UserRound size={18} />
          <div>
            <strong>{user.name}</strong>
            <span>{roleLabels[user.role]}</span>
          </div>
        </div>
        <nav className="nav-list">
          {allowedTabs.map((tab) => (
            <button key={tab.id} className={view === tab.id ? 'active' : ''} onClick={() => setView(tab.id)}>
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
        <button className="ghost-button" onClick={logout}>
          <LogOut size={16} />
          Quitter
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations en temps reel</p>
            <h2>{view === 'depot' ? 'Depot intermediaire' : view === 'laundry' ? 'Laverie' : view === 'transformer' ? 'Transformateur' : 'Supervision NFN'}</h2>
          </div>
          <div className="top-actions">
            {(user.role === 'responsable_depot' || user.role === 'admin_NFN') && (
              <button className="secondary-button" onClick={seedDemoLot} disabled={busy}>
                <PackageCheck size={16} />
                Lot demo
              </button>
            )}
            <button className="primary-button" onClick={refreshData} disabled={busy}>
              <RefreshCw size={16} className={busy ? 'spin' : ''} />
              Actualiser
            </button>
            <button className="secondary-button" onClick={downloadReport} disabled={busy}>
              <FileText size={16} />
              CSV
            </button>
          </div>
        </header>

        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        <KpiStrip data={data} role={user.role} view={view} />
        <SlaOverview data={data} />

        {view === 'depot' && <DepotView token={tokens.access_token} data={data} busy={busy} run={run} />}
        {view === 'laundry' && <LaundryView token={tokens.access_token} data={data} busy={busy} run={run} />}
        {view === 'transformer' && <TransformerView token={tokens.access_token} data={data} busy={busy} run={run} role={user.role} />}
        {view === 'admin' && <AdminView token={tokens.access_token} data={data} run={run} />}
      </main>
    </div>
  );
}

function LoginScreen({ busy, error, onLogin }: { busy: boolean; error: string; onLogin: (email: string, password: string) => void }) {
  const [email, setEmail] = useState(demoUsers[0].email);
  const [password, setPassword] = useState(demoUsers[0].password);

  function submit(event: FormEvent) {
    event.preventDefault();
    onLogin(email, password);
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-hero">
          <div className="brand-block">
            <div className="brand-mark">NFN</div>
            <div>
              <p className="eyebrow">Operator Console</p>
              <h1>Acces operations</h1>
            </div>
          </div>
        </div>
        <div className="login-content">
          <form onSubmit={submit} className="login-form">
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Mot de passe
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <div className="notice error">{error}</div>}
            <button className="primary-button wide login-submit" disabled={busy}>
              <BadgeCheck size={20} />
              Se connecter
            </button>
          </form>
          <div className="demo-grid">
            {demoUsers.map((demo) => (
              <button
                key={demo.email}
                onClick={() => {
                  setEmail(demo.email);
                  setPassword(demo.password);
                  onLogin(demo.email, demo.password);
                }}
              >
                <strong>{demo.label}</strong>
                <span>{roleLabels[demo.role]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

type KpiTone = 'ok' | 'warning' | 'critical' | 'accent';

function countDueSoon(bdcs: BdcRecord[], hours = 4): number {
  return bdcs.filter((bdc) => {
    const remaining = hoursUntil(bdc.expected_delivery_at);
    return remaining >= 0 && remaining <= hours;
  }).length;
}

function countLate(bdcs: BdcRecord[]): number {
  return bdcs.filter((bdc) => hoursUntil(bdc.expected_delivery_at) < 0).length;
}

function KpiStrip({ data, role, view }: { data: DashboardData; role: Role; view: View }) {
  const maxUtilization = Math.max(0, ...((data.policies?.depot_capacity ?? []).map((item) => item.utilization_pct)));
  const openLaundry = data.openBdcs.filter((bdc) => bdc.kind === 'laundry');
  const openTransformer = data.openBdcs.filter((bdc) => bdc.kind === 'transformer');
  const stockWeight = data.stock.reduce((total, lot) => total + Number(lot.observed_weight_kg ?? 0), 0);
  const incomingLaundryKg = data.incomingLaundry.reduce((total, bdc) => total + Number(bdc.total_weight_kg ?? 0), 0);
  const incomingTransformerKg = data.incomingTransformer.reduce((total, bdc) => total + Number(bdc.total_weight_kg ?? 0), 0);
  const overdueCount = data.policies?.overdue_lots.length ?? 0;
  const baseCards = {
    depot: [
      { label: 'Lots a recevoir', value: data.pending.length, hint: 'Entrees terrain', icon: ScanLine, tone: data.pending.length ? 'accent' : 'ok' },
      { label: 'Stock courant', value: data.stock.length, hint: kg(stockWeight), icon: Archive, tone: maxUtilization >= 90 ? 'critical' : maxUtilization >= 75 ? 'warning' : 'ok' },
      { label: 'Prets laverie', value: data.stock.filter((lot) => lot.status === 'classified').length, hint: 'Lots classes', icon: PackageCheck, tone: 'ok' },
      { label: 'BDC laverie', value: openLaundry.length, hint: `${countDueSoon(openLaundry)} proche SLA`, icon: FileText, tone: countLate(openLaundry) ? 'critical' : countDueSoon(openLaundry) ? 'warning' : 'ok' },
      { label: 'Capacite depot', value: `${Math.round(maxUtilization)}%`, hint: 'Seuil stockage', icon: Boxes, tone: maxUtilization > 100 ? 'critical' : maxUtilization >= 85 ? 'warning' : 'ok' },
      { label: 'SLA depasses', value: overdueCount, hint: 'Lots a traiter', icon: Flame, tone: overdueCount ? 'critical' : 'ok' },
    ],
    laundry: [
      { label: 'BDC entrants', value: data.incomingLaundry.length, hint: kg(incomingLaundryKg), icon: ScanLine, tone: data.incomingLaundry.length ? 'accent' : 'ok' },
      { label: 'A laver', value: openLaundry.length, hint: 'Cycles ouverts', icon: Waves, tone: openLaundry.length ? 'warning' : 'ok' },
      { label: 'Livraisons proches', value: countDueSoon(openLaundry), hint: 'Moins de 4h', icon: Flame, tone: countDueSoon(openLaundry) ? 'warning' : 'ok' },
      { label: 'Retards BDC', value: countLate(openLaundry), hint: 'Reception/sortie', icon: AlertTriangle, tone: countLate(openLaundry) ? 'critical' : 'ok' },
      { label: 'Certificats', value: data.bdcs.filter((bdc) => bdc.certificate_id).length, hint: 'Purete liee', icon: BadgeCheck, tone: 'ok' },
      { label: 'SLA lots', value: overdueCount, hint: 'Flux complet', icon: Route, tone: overdueCount ? 'critical' : 'ok' },
    ],
    transformer: [
      { label: 'BDC entrants', value: data.incomingTransformer.length, hint: kg(incomingTransformerKg), icon: Factory, tone: data.incomingTransformer.length ? 'accent' : 'ok' },
      { label: 'A confirmer', value: openTransformer.length, hint: 'Reception poids/prix', icon: ClipboardList, tone: openTransformer.length ? 'warning' : 'ok' },
      { label: 'Livraisons proches', value: countDueSoon(openTransformer), hint: 'Moins de 4h', icon: Flame, tone: countDueSoon(openTransformer) ? 'warning' : 'ok' },
      { label: 'Retards BDC', value: countLate(openTransformer), hint: 'Confirmation > SLA', icon: AlertTriangle, tone: countLate(openTransformer) ? 'critical' : 'ok' },
      { label: 'Lots livres', value: data.stock.filter((lot) => lot.status === 'delivered').length, hint: 'Finalises', icon: CheckCircle2, tone: 'ok' },
      { label: 'SLA lots', value: overdueCount, hint: 'Flux complet', icon: Route, tone: overdueCount ? 'critical' : 'ok' },
    ],
    admin: [
      { label: 'Alertes actives', value: data.alerts.length, hint: `${data.alerts.filter((alert) => alert.severity === 'critical').length} critiques`, icon: AlertTriangle, tone: data.alerts.some((alert) => alert.severity === 'critical') ? 'critical' : data.alerts.length ? 'warning' : 'ok' },
      { label: 'Sites actifs', value: data.sites.filter((site) => site.active).length, hint: 'Depots/laveries/T1/T2', icon: Factory, tone: 'ok' },
      { label: 'Comptes', value: data.users.length, hint: 'Operateurs', icon: UserRound, tone: 'ok' },
      { label: 'BDC ouverts', value: data.openBdcs.length, hint: `${countLate(data.openBdcs)} en retard`, icon: FileText, tone: countLate(data.openBdcs) ? 'critical' : countDueSoon(data.openBdcs) ? 'warning' : 'ok' },
      { label: 'Capacite max', value: `${Math.round(maxUtilization)}%`, hint: 'Tous depots', icon: Boxes, tone: maxUtilization > 100 ? 'critical' : maxUtilization >= 85 ? 'warning' : 'ok' },
      { label: 'SLA depasses', value: overdueCount, hint: 'Lots non conformes', icon: Flame, tone: overdueCount ? 'critical' : 'ok' },
    ],
  } satisfies Record<View, { label: string; value: string | number; hint: string; icon: typeof Boxes; tone: KpiTone }[]>;
  const cards = role === 'admin_NFN' ? baseCards[view] : baseCards[view].filter(Boolean);
  return (
    <section className="kpi-strip">
      {cards.map((card) => (
        <article key={card.label} className={`kpi-card tone-${card.tone}`}>
          <card.icon size={20} />
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <small>{card.hint}</small>
        </article>
      ))}
    </section>
  );
}

function SlaOverview({ data }: { data: DashboardData }) {
  const thresholds = data.policies?.thresholds ?? {};
  const openBdcs = data.openBdcs.slice(0, 4);
  return (
    <section className="sla-panel">
      <div className="sla-header">
        <div>
          <p className="eyebrow">SLA et timing</p>
          <h3>Analyse operationnelle</h3>
        </div>
        <div className="sla-thresholds">
          <span>Depot {thresholds.depot_max_storage_hours ?? 12}h</span>
          <span>{kg(thresholds.depot_max_storage_kg ?? 5000)} max</span>
        </div>
      </div>
      <div className="sla-grid">
        <div className="sla-block">
          <strong>Capacite depot</strong>
          {(data.policies?.depot_capacity ?? []).map((item) => (
            <div className="capacity-row" key={item.site_id}>
              <div>
                <span>{item.site_name ?? item.site_id}</span>
                <small>{kg(item.current_weight_kg)} / {kg(item.max_storage_kg)}</small>
              </div>
              <div className="capacity-track">
                <span style={{ width: `${Math.min(item.utilization_pct, 100)}%` }} className={item.breached ? 'breached' : ''} />
              </div>
              <b>{Math.round(item.utilization_pct)}%</b>
            </div>
          ))}
          {!data.policies?.depot_capacity.length && <EmptyState text="Aucun stock depot analyse." />}
        </div>
        <div className="sla-block">
          <strong>Lots hors SLA</strong>
          {(data.policies?.overdue_lots ?? []).slice(0, 4).map((lot) => (
            <article key={lot.lot_id} className="deadline-row danger">
              <span>{lot.lot_id}</span>
              <small>{lot.status} - {lot.age_hours}h / {lot.max_hours}h</small>
            </article>
          ))}
          {!data.policies?.overdue_lots.length && <EmptyState text="Aucun lot hors delai." />}
        </div>
        <div className="sla-block">
          <strong>BDC ouverts</strong>
          {openBdcs.map((bdc) => {
            const hours = hoursUntil(bdc.expected_delivery_at);
            return (
              <article key={bdc.bdc_id} className={`deadline-row ${hours < 0 ? 'danger' : hours < 4 ? 'warning' : ''}`}>
                <span>{bdc.bdc_id}</span>
                <small>{hours < 0 ? `${Math.abs(hours).toFixed(1)}h retard` : `${hours.toFixed(1)}h restantes`} - {bdc.destination_stage ?? bdc.kind}</small>
              </article>
            );
          })}
          {openBdcs.length === 0 && <EmptyState text="Aucun BDC ouvert." />}
        </div>
      </div>
    </section>
  );
}

function DepotView({ token, data, busy, run }: { token: string; data: DashboardData; busy: boolean; run: <T>(label: string, task: () => Promise<T>) => Promise<T | undefined> }) {
  const [selectedPending, setSelectedPending] = useState('');
  const [selectedStock, setSelectedStock] = useState('');
  const pendingLot = data.pending.find((lot) => lot.lot_id === selectedPending) ?? data.pending[0];
  const stockLot = data.stock.find((lot) => lot.lot_id === selectedStock) ?? data.stock[0];
  const classifiedLots = data.stock.filter((lot) => lot.status === 'classified');
  const [shipmentLots, setShipmentLots] = useState<string[]>([]);
  const laundrySites = data.sites.filter((site) => site.site_type === 'laverie' && site.active);
  const currentQr = stockLot?.qr_payload ?? pendingLot?.qr_payload ?? '';

  useEffect(() => {
    if (!selectedPending && data.pending[0]) setSelectedPending(data.pending[0].lot_id);
    if (!selectedStock && data.stock[0]) setSelectedStock(data.stock[0].lot_id);
  }, [data.pending, data.stock, selectedPending, selectedStock]);

  return (
    <section className="grid two">
      <Panel title="Nouveau lot depot" icon={PackageCheck}>
        <ActionForm
          busy={busy}
          button="Ajouter lot"
          fields={[
            { name: 'source_id', label: 'Source / producteur', defaultValue: 'SRC-2026-001' },
            { name: 'source_name', label: 'Nom source', defaultValue: 'Ferme Ouled Djellal' },
            { name: 'observed_weight_kg', label: 'Poids net kg', type: 'number', defaultValue: '82' },
            { name: 'estimated_weight_kg', label: 'Poids brut estime kg', type: 'number', defaultValue: '85' },
            { name: 'wool_origin', label: 'Origine', defaultValue: 'tonte', options: [{ value: 'tonte', label: 'Tonte' }, { value: 'abattage', label: 'Abattage' }] },
            { name: 'wool_type', label: 'Type laine', defaultValue: 'toison entiere' },
            { name: 'sheep_race', label: 'Race', defaultValue: 'Ouled Djellal' },
            { name: 'cleanliness_score', label: 'Proprete 1-5', type: 'number', defaultValue: '2' },
            { name: 'humidity_pct', label: 'Humidite %', type: 'number', defaultValue: '14' },
            { name: 'packaging_count', label: 'Nombre sacs', type: 'number', defaultValue: '6' },
            { name: 'packaging_type', label: 'Type sacs', defaultValue: 'PP' },
            { name: 'staple_length_mm', label: 'Longueur meche mm', type: 'number', defaultValue: '65' },
            { name: 'jarre_pct', label: 'Taux jarre %', type: 'number', defaultValue: '2' },
            { name: 'cleanliness', label: 'Annotation proprete', defaultValue: 'paille, foin' },
          ]}
          onSubmit={(values) => run('Lot depot ajoute', () => api.createDepotLot(token, {
            ...values,
            observed_weight_kg: Number(values.observed_weight_kg),
            estimated_weight_kg: Number(values.estimated_weight_kg),
            cleanliness_score: Number(values.cleanliness_score),
            humidity_pct: Number(values.humidity_pct),
            packaging_count: Number(values.packaging_count),
            staple_length_mm: Number(values.staple_length_mm),
            jarre_pct: Number(values.jarre_pct),
            cleanliness_notes: values.cleanliness.split(',').map((item) => item.trim()).filter(Boolean),
          }))}
        />
      </Panel>

      <Panel title="Reception depot" icon={ScanLine}>
        <LotSelect lots={data.pending} value={selectedPending} onChange={setSelectedPending} empty="Aucun lot en attente. Utilisez Lot demo pour tester." />
        <ActionForm
          busy={busy}
          button="Valider reception"
          fields={[
            { name: 'received_weight_kg', label: 'Poids recu kg', type: 'number', defaultValue: String(pendingLot?.observed_weight_kg ?? 90) },
            { name: 'storage_zone', label: 'Zone stockage', defaultValue: 'A1' },
            { name: 'arrival_condition', label: 'Etat arrivee', defaultValue: 'correct' },
            { name: 'discrepancy_reason', label: 'Motif ecart', defaultValue: '' },
          ]}
          onSubmit={(values) => run('Reception depot validee', () => api.receiveDepot(token, { lot_id: pendingLot?.lot_id, ...values, received_weight_kg: Number(values.received_weight_kg) }))}
          disabled={!pendingLot}
        />
      </Panel>

      <Panel title="Classification et stock" icon={ClipboardList}>
        <LotSelect lots={data.stock} value={selectedStock} onChange={setSelectedStock} empty="Aucun lot en stock depot." />
        <ActionForm
          busy={busy}
          button="Classer le lot"
          fields={[
            { name: 'classification', label: 'Classe', defaultValue: 'Classe A' },
            { name: 'vm_percent', label: 'VM %', type: 'number', defaultValue: '4' },
            { name: 'fiber_state', label: 'Etat fibre', defaultValue: 'long' },
            { name: 'color', label: 'Couleur', defaultValue: 'blanc' },
          ]}
          onSubmit={(values) => run('Classification enregistree', () => api.classify(token, { lot_id: stockLot?.lot_id, ...values, vm_percent: Number(values.vm_percent) }))}
          disabled={!stockLot}
        />
        <ActionForm
          busy={busy}
          button="Relever temperature"
          fields={[
            { name: 'temperature_c', label: 'Temperature C', type: 'number', defaultValue: '39' },
            { name: 'note', label: 'Note', defaultValue: '' },
          ]}
          onSubmit={(values) => run('Temperature stock enregistree', () => api.stockTemperature(token, { lot_id: stockLot?.lot_id, temperature_c: Number(values.temperature_c), note: values.note }))}
          disabled={!stockLot}
        />
      </Panel>

      <Panel title="Sortie vers laverie" icon={Truck} wide>
        <div className="selection-list">
          {classifiedLots.map((lot) => (
            <label key={lot.lot_id}>
              <input
                type="checkbox"
                checked={shipmentLots.includes(lot.lot_id)}
                onChange={(event) => setShipmentLots((current) => (event.target.checked ? [...current, lot.lot_id] : current.filter((id) => id !== lot.lot_id)))}
              />
              <span>{lot.lot_id}</span>
              <small>{lot.classification} - {kg(lot.observed_weight_kg)}</small>
            </label>
          ))}
          {classifiedLots.length === 0 && <EmptyState text="Classez au moins un lot avant emission BDC." />}
        </div>
        <ActionForm
          busy={busy}
          button="Generer BDC laverie"
          fields={[
            { name: 'humidity_pct', label: 'Humidite %', type: 'number', defaultValue: '14' },
            { name: 'laundry_name', label: 'Laverie destination', defaultValue: 'Laverie Centre' },
            { name: 'destination_site_id', label: 'Site laverie', defaultValue: laundrySites[0]?.site_id ?? '', options: [{ value: '', label: 'Auto' }, ...laundrySites.map((site) => ({ value: site.site_id, label: site.name }))] },
            { name: 'transporteur_email', label: 'Transporteur email', defaultValue: 'transport@example.com' },
            { name: 'destination_email', label: 'Destination email', defaultValue: laundrySites[0]?.contact_email ?? 'laundry@nfn.example.com' },
            { name: 'expected_delivery_at', label: 'Livraison attendue', type: 'datetime-local', defaultValue: localDateTime(8) },
          ]}
          onSubmit={(values) => run('BDC laverie emis', () => api.createLaundryShipment(token, { ...values, destination_site_id: values.destination_site_id || undefined, lot_ids: shipmentLots, humidity_pct: Number(values.humidity_pct), expected_delivery_at: new Date(values.expected_delivery_at).toISOString() }))}
          disabled={shipmentLots.length === 0}
        />
      </Panel>

      <BdcPanel title="BDC ouverts" bdcs={data.openBdcs.filter((bdc) => bdc.kind === 'laundry')} />
      <QrPanel title="QR dernier lot depot" payload={currentQr} token={token} run={run} />
    </section>
  );
}

function LaundryView({ token, data, busy, run }: { token: string; data: DashboardData; busy: boolean; run: <T>(label: string, task: () => Promise<T>) => Promise<T | undefined> }) {
  const [selectedReceiptBdc, setSelectedReceiptBdc] = useState('');
  const [selectedWorkBdc, setSelectedWorkBdc] = useState('');
  const laundryBdcs = data.bdcs.filter((item) => item.kind === 'laundry');
  const workBdcs = laundryBdcs.length > 0 ? laundryBdcs : data.incomingLaundry;
  const receiptBdc = data.incomingLaundry.find((item) => item.bdc_id === selectedReceiptBdc) ?? data.incomingLaundry[0];
  const workBdc = workBdcs.find((item) => item.bdc_id === selectedWorkBdc) ?? workBdcs[0];
  const transformerSites = data.sites.filter((site) => ['transformer_t1', 'transformer_t2'].includes(site.site_type) && site.active);

  useEffect(() => {
    if (!selectedReceiptBdc && data.incomingLaundry[0]) setSelectedReceiptBdc(data.incomingLaundry[0].bdc_id);
  }, [data.incomingLaundry, selectedReceiptBdc]);

  useEffect(() => {
    if (!selectedWorkBdc && workBdcs[0]) setSelectedWorkBdc(workBdcs[0].bdc_id);
  }, [selectedWorkBdc, workBdcs]);

  return (
    <section className="grid two">
      <Panel title="Reception laverie" icon={ScanLine}>
        <BdcSelect bdcs={data.incomingLaundry} value={selectedReceiptBdc} onChange={setSelectedReceiptBdc} empty="Aucun BDC laverie ouvert." />
        <ActionForm
          busy={busy}
          button="Cloturer reception"
          fields={[
            { name: 'received_weight_kg', label: 'Poids recu kg', type: 'number', defaultValue: String(receiptBdc?.total_weight_kg ?? 90) },
            { name: 'discrepancy_reason', label: 'Motif ecart', defaultValue: '' },
          ]}
          onSubmit={(values) => run('Reception laverie cloturee', () => api.laundryReceipt(token, { bdc_id: receiptBdc?.bdc_id, received_weight_kg: Number(values.received_weight_kg), discrepancy_reason: values.discrepancy_reason }))}
          disabled={!receiptBdc}
        />
      </Panel>

      <Panel title="Cycle de lavage" icon={Waves}>
        <BdcSelect bdcs={workBdcs} value={selectedWorkBdc} onChange={setSelectedWorkBdc} empty="Selectionnez un BDC." />
        <ActionForm
          busy={busy}
          button="Demarrer cycle"
          fields={[
            { name: 'water_temperature_c', label: 'Temperature eau C', type: 'number', defaultValue: '47' },
            { name: 'detergent', label: 'Detergent', defaultValue: 'standard' },
            { name: 'duration_minutes', label: 'Duree minutes', type: 'number', defaultValue: '75' },
            { name: 'target_transformer', label: 'Destination T1/T2', defaultValue: 'T1' },
            { name: 'override_reason', label: 'Motif modification', defaultValue: '' },
          ]}
          onSubmit={(values) => run('Cycle lavage cree', () => api.washRun(token, { bdc_id: workBdc?.bdc_id, ...values, water_temperature_c: Number(values.water_temperature_c), duration_minutes: Number(values.duration_minutes) }))}
          disabled={!workBdc}
        />
      </Panel>

      <Panel title="Sortie laverie et certificat" icon={FileText} wide>
        <BdcSelect bdcs={workBdcs} value={selectedWorkBdc} onChange={setSelectedWorkBdc} empty="Selectionnez un BDC." />
        <ActionForm
          busy={busy}
          button="Valider sortie et BDC transformateur"
          fields={[
            { name: 'dry_weight_kg', label: 'Poids net sec kg', type: 'number', defaultValue: '55' },
            { name: 'waste_weight_kg', label: 'Dechets kg', type: 'number', defaultValue: '15' },
            { name: 'water_loss_kg', label: 'Eau perdue kg', type: 'number', defaultValue: '18' },
            { name: 'residual_humidity_pct', label: 'Humidite residuelle %', type: 'number', defaultValue: '13' },
            { name: 'residual_suint_pct', label: 'Suint residuel %', type: 'number', defaultValue: '0.8' },
            { name: 'ph', label: 'pH', type: 'number', defaultValue: '7' },
            { name: 'grade', label: 'Grade 1-5', type: 'number', defaultValue: '2' },
            { name: 'notes', label: 'Note', defaultValue: '' },
            { name: 'transporteur_email', label: 'Transporteur email', defaultValue: 'transport2@example.com' },
            { name: 'transformer_site_id', label: 'Site transformateur', defaultValue: transformerSites[0]?.site_id ?? '', options: [{ value: '', label: 'Auto' }, ...transformerSites.map((site) => ({ value: site.site_id, label: site.name }))] },
            { name: 'destination_email', label: 'Email transformateur', defaultValue: transformerSites[0]?.contact_email ?? 't1@nfn.example.com' },
            { name: 'expected_delivery_at', label: 'Livraison attendue', type: 'datetime-local', defaultValue: localDateTime(12) },
          ]}
          onSubmit={(values) => run('Sortie laverie validee', () => api.laundryOutput(token, { bdc_id: workBdc?.bdc_id, ...values, transformer_site_id: values.transformer_site_id || undefined, dry_weight_kg: Number(values.dry_weight_kg), waste_weight_kg: Number(values.waste_weight_kg), water_loss_kg: Number(values.water_loss_kg), residual_humidity_pct: Number(values.residual_humidity_pct), residual_suint_pct: Number(values.residual_suint_pct), ph: Number(values.ph), grade: Number(values.grade), expected_delivery_at: new Date(values.expected_delivery_at).toISOString() }))}
          disabled={!workBdc}
        />
      </Panel>
      <BdcPanel title="BDC laverie" bdcs={workBdcs} />
      <QrPanel title="QR BDC selectionne" payload={workBdc?.qr_payload ?? ''} token={token} run={run} />
    </section>
  );
}

function TransformerView({ token, data, busy, run, role }: { token: string; data: DashboardData; busy: boolean; role: Role; run: <T>(label: string, task: () => Promise<T>) => Promise<T | undefined> }) {
  const isT1 = role === 'transformateur_T1';
  const targetStage = isT1 ? 'T1' : 'T2';
  const [selectedReceiptBdc, setSelectedReceiptBdc] = useState('');
  const [selectedWorkBdc, setSelectedWorkBdc] = useState('');
  const transformerBdcs = data.bdcs.filter((item) => item.kind === 'transformer' && item.destination_stage?.toUpperCase() === targetStage);
  const workBdcs = transformerBdcs.length > 0 ? transformerBdcs : data.incomingTransformer;
  const receiptBdc = data.incomingTransformer.find((item) => item.bdc_id === selectedReceiptBdc) ?? data.incomingTransformer[0];
  const workBdc = workBdcs.find((item) => item.bdc_id === selectedWorkBdc) ?? workBdcs[0];

  useEffect(() => {
    if (!selectedReceiptBdc && data.incomingTransformer[0]) setSelectedReceiptBdc(data.incomingTransformer[0].bdc_id);
  }, [data.incomingTransformer, selectedReceiptBdc]);

  useEffect(() => {
    if (!selectedWorkBdc && workBdcs[0]) setSelectedWorkBdc(workBdcs[0].bdc_id);
  }, [selectedWorkBdc, workBdcs]);

  return (
    <section className="grid two">
      <Panel title="Reception transformateur" icon={Factory}>
        <BdcSelect bdcs={data.incomingTransformer} value={selectedReceiptBdc} onChange={setSelectedReceiptBdc} empty="Aucun BDC transformateur ouvert pour ce role." />
        <ActionForm
          busy={busy}
          button="Confirmer reception"
          fields={[
            { name: 'received_weight_kg', label: 'Poids recu kg', type: 'number', defaultValue: String(receiptBdc?.total_weight_kg ?? 50) },
            { name: 'price_da_per_kg', label: 'Prix DA/kg', type: 'number', defaultValue: '220' },
            { name: 'discrepancy_reason', label: 'Motif ecart', defaultValue: '' },
          ]}
          onSubmit={(values) => run('Reception transformateur confirmee', () => api.transformerReceipt(token, { bdc_id: receiptBdc?.bdc_id, received_weight_kg: Number(values.received_weight_kg), price_da_per_kg: Number(values.price_da_per_kg), discrepancy_reason: values.discrepancy_reason }))}
          disabled={!receiptBdc}
        />
      </Panel>

      {isT1 ? (
        <Panel title="Production T1" icon={Route}>
          <BdcSelect bdcs={workBdcs} value={selectedWorkBdc} onChange={setSelectedWorkBdc} empty="Selectionnez un BDC T1." />
          <ActionForm
            busy={busy}
            button="Generer lot final T1"
            fields={[
              { name: 'flow_destination', label: 'Flux A1/A2/A3', defaultValue: 'A1' },
              { name: 'anti_mite', label: 'Traitement antimites', defaultValue: 'sel de bore' },
              { name: 'binding_fiber_pct', label: 'Fibres liaison %', type: 'number', defaultValue: '8' },
              { name: 'fire_retardant', label: 'Ignifuge', defaultValue: 'standard' },
              { name: 'target_density_kg_m3', label: 'Densite kg/m3', type: 'number', defaultValue: '35' },
              { name: 'target_thickness_mm', label: 'Epaisseur mm', type: 'number', defaultValue: '50' },
            ]}
            onSubmit={(values) => run('Lot final T1 cree', () => api.t1Production(token, { bdc_id: workBdc?.bdc_id, ...values, binding_fiber_pct: Number(values.binding_fiber_pct), target_density_kg_m3: Number(values.target_density_kg_m3), target_thickness_mm: Number(values.target_thickness_mm) }))}
            disabled={!workBdc}
          />
        </Panel>
      ) : (
        <Panel title="Reception T2" icon={ClipboardList}>
          <BdcSelect bdcs={workBdcs} value={selectedWorkBdc} onChange={setSelectedWorkBdc} empty="Selectionnez un BDC T2." />
          <ActionForm
            busy={busy}
            button="Cloturer T2"
            fields={[
              { name: 'dryness_ok', label: 'Indice secheresse OK true/false', defaultValue: 'true' },
              { name: 'foreign_bodies_ok', label: 'Corps etrangers OK true/false', defaultValue: 'true' },
              { name: 'unloading_mode', label: 'Mode vrac/balles', defaultValue: 'vrac' },
            ]}
            onSubmit={(values) => run('Lot final T2 cree', () => api.t2Reception(token, { bdc_id: workBdc?.bdc_id, dryness_ok: values.dryness_ok === 'true', foreign_bodies_ok: values.foreign_bodies_ok === 'true', unloading_mode: values.unloading_mode }))}
            disabled={!workBdc}
          />
        </Panel>
      )}
      <BdcPanel title="BDC transformateur" bdcs={workBdcs} />
      <QrPanel title="QR BDC selectionne" payload={workBdc?.qr_payload ?? ''} token={token} run={run} />
    </section>
  );
}

function AdminView({ token, data, run }: { token: string; data: DashboardData; run: <T>(label: string, task: () => Promise<T>) => Promise<T | undefined> }) {
  const [lotId, setLotId] = useState('');
  const [events, setEvents] = useState<TraceabilityEvent[]>([]);
  const siteOptions = data.sites.map((site) => ({ value: site.site_id, label: `${site.name} (${site.site_type})` }));
  return (
    <section className="grid two">
      <Panel title="Creer site operateur" icon={Factory}>
        <ActionForm
          busy={false}
          button="Creer site"
          fields={[
            { name: 'name', label: 'Nom site', defaultValue: 'Depot Sud' },
            { name: 'site_type', label: 'Type', defaultValue: 'depot', options: [{ value: 'depot', label: 'Depot' }, { value: 'laverie', label: 'Laverie' }, { value: 'transformer_t1', label: 'Transformateur T1' }, { value: 'transformer_t2', label: 'Transformateur T2' }] },
            { name: 'wilaya', label: 'Wilaya', defaultValue: 'Djelfa' },
            { name: 'commune', label: 'Commune', defaultValue: 'Messaad' },
            { name: 'address', label: 'Adresse', defaultValue: 'Zone industrielle' },
            { name: 'contact_email', label: 'Email contact', defaultValue: 'site@nfn.example.com' },
          ]}
          onSubmit={(values) => run('Site cree', () => api.createSite(token, { ...values, active: true }))}
        />
      </Panel>

      <Panel title="Creer compte operateur" icon={UserRound}>
        <ActionForm
          busy={false}
          button="Creer compte"
          fields={[
            { name: 'name', label: 'Nom', defaultValue: 'Operateur NFN' },
            { name: 'email', label: 'Email', defaultValue: `operator.${Date.now()}@nfn.example.com` },
            { name: 'password', label: 'Mot de passe', defaultValue: 'operator123' },
            { name: 'role', label: 'Role', defaultValue: 'responsable_depot', options: [{ value: 'responsable_depot', label: 'Depot' }, { value: 'responsable_laverie', label: 'Laverie' }, { value: 'transformateur_T1', label: 'T1' }, { value: 'transformateur_T2', label: 'T2' }, { value: 'admin_NFN', label: 'Admin' }] },
            { name: 'site_id', label: 'Site rattache', defaultValue: siteOptions[0]?.value ?? '', options: [{ value: '', label: 'Aucun' }, ...siteOptions] },
          ]}
          onSubmit={(values) => run('Compte cree', () => api.createUser(token, { ...values, site_id: values.site_id || undefined }))}
        />
      </Panel>

      <Panel title="Politiques SLA" icon={ShieldCheck}>
        <ActionForm
          busy={false}
          button="Mettre a jour"
          fields={[
            { name: 'depot_max_storage_kg', label: 'Max stockage depot kg', type: 'number', defaultValue: String(data.policies?.thresholds.depot_max_storage_kg ?? 5000) },
            { name: 'depot_max_storage_hours', label: 'Max temps depot h', type: 'number', defaultValue: String(data.policies?.thresholds.depot_max_storage_hours ?? 12) },
            { name: 'laundry_max_processing_hours', label: 'Max temps laverie h', type: 'number', defaultValue: String(data.policies?.thresholds.laundry_max_processing_hours ?? 12) },
            { name: 'lot_transformation_sla_hours', label: 'SLA transformation h', type: 'number', defaultValue: String(data.policies?.thresholds.lot_transformation_sla_hours ?? 24) },
            { name: 'stock_temperature_c', label: 'Temperature stock max C', type: 'number', defaultValue: String(data.policies?.thresholds.stock_temperature_c ?? 45) },
            { name: 'receipt_gap_pct', label: 'Ecart poids max %', type: 'number', defaultValue: String(data.policies?.thresholds.receipt_gap_pct ?? 5) },
          ]}
          onSubmit={(values) => run('Politiques mises a jour', () => api.updatePolicies(token, {
            depot_max_storage_kg: Number(values.depot_max_storage_kg),
            depot_max_storage_hours: Number(values.depot_max_storage_hours),
            laundry_max_processing_hours: Number(values.laundry_max_processing_hours),
            lot_transformation_sla_hours: Number(values.lot_transformation_sla_hours),
            stock_temperature_c: Number(values.stock_temperature_c),
            receipt_gap_pct: Number(values.receipt_gap_pct),
          }))}
        />
      </Panel>

      <Panel title="Etat SLA" icon={AlertTriangle}>
        <div className="stack-list">
          {(data.policies?.depot_capacity ?? []).map((item) => (
            <article key={item.site_id} className={`row-card ${item.breached ? 'severity-critical' : ''}`}>
              <strong>{item.site_name ?? item.site_id}</strong>
              <span>{kg(item.current_weight_kg)} / {kg(item.max_storage_kg)}</span>
              <small>{item.utilization_pct}% utilise</small>
            </article>
          ))}
          {(data.policies?.overdue_lots ?? []).map((lot) => (
            <article key={lot.lot_id} className="row-card severity-warning">
              <strong>{lot.lot_id}</strong>
              <span>{lot.status} - {lot.age_hours}h</span>
              <small>SLA max {lot.max_hours}h</small>
            </article>
          ))}
          {!data.policies?.depot_capacity.length && !data.policies?.overdue_lots.length && <EmptyState text="Aucun depassement SLA." />}
        </div>
      </Panel>

      <Panel title="Alertes actives" icon={Flame}>
        <div className="stack-list">
          {data.alerts.map((alert) => (
            <article key={alert.alert_id} className={`row-card severity-${alert.severity}`}>
              <strong>{alert.alert_type}</strong>
              <span>{alert.message}</span>
              <small>{alert.lot_id ?? 'global'} - {when(alert.created_at)}</small>
            </article>
          ))}
          {data.alerts.length === 0 && <EmptyState text="Aucune alerte active." />}
        </div>
      </Panel>
      <Panel title="Traceabilite lot" icon={Route}>
        <div className="inline-form">
          <input value={lotId} onChange={(event) => setLotId(event.target.value)} placeholder="LOT-2026-042" />
          <button
            className="primary-button"
            onClick={() => run('Trace chargee', async () => {
              const result = await api.traceability(token, lotId);
              setEvents(result);
              return result;
            })}
            disabled={!lotId}
          >
            Voir
          </button>
        </div>
        <Timeline events={events} />
      </Panel>
      <Panel title="Comptes et sites" icon={ShieldCheck} wide>
        <div className="bdc-grid">
          {data.sites.map((site) => (
            <article className="bdc-card" key={site.site_id}>
              <strong>{site.name}</strong>
              <span>{site.site_type} - {site.wilaya ?? 'n/a'}</span>
              <small>{site.site_id}</small>
            </article>
          ))}
          {data.users.map((item) => (
            <article className="bdc-card" key={item.user_id}>
              <strong>{item.name}</strong>
              <span>{roleLabels[item.role]}</span>
              <small>{item.email} - {item.site_name ?? 'sans site'}</small>
            </article>
          ))}
        </div>
      </Panel>
      <BdcPanel title="Tous les BDC" bdcs={data.bdcs} />
    </section>
  );
}

function QrPanel({ title, payload, token, run }: { title: string; payload: string; token: string; run: <T>(label: string, task: () => Promise<T>) => Promise<T | undefined> }) {
  const [qrUrl, setQrUrl] = useState('');
  const [manualPayload, setManualPayload] = useState('');
  const [scanResult, setScanResult] = useState<QrScanResult | null>(null);
  const [cameraStatus, setCameraStatus] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  useEffect(() => {
    if (!payload) {
      setQrUrl('');
      return;
    }
    QRCode.toDataURL(payload, { margin: 4, width: 320, errorCorrectionLevel: 'M', color: { dark: '#172019', light: '#ffffff' } })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [payload]);

  useEffect(() => () => stopCamera(), []);

  async function validate(value: string) {
    const cleaned = value.trim();
    if (!cleaned) return;
    await run('QR verifie', async () => {
      const result = await api.scanQr(token, { qr_payload: cleaned });
      setScanResult(result);
      return result;
    });
  }

  function stopCamera() {
    if (scanFrameRef.current !== null) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
  }

  function readQrFromCanvas(context: CanvasRenderingContext2D, width: number, height: number): string | null {
    function decodeFrame(frame: ImageData): string | null {
      const direct = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'attemptBoth' });
      if (direct?.data) return direct.data;

      const normalized = new Uint8ClampedArray(frame.data);
      for (let index = 0; index < normalized.length; index += 4) {
        const luminance = normalized[index] * 0.299 + normalized[index + 1] * 0.587 + normalized[index + 2] * 0.114;
        const value = luminance < 150 ? 0 : 255;
        normalized[index] = value;
        normalized[index + 1] = value;
        normalized[index + 2] = value;
        normalized[index + 3] = 255;
      }
      const highContrast = jsQR(normalized, frame.width, frame.height, { inversionAttempts: 'attemptBoth' });
      return highContrast?.data ?? null;
    }

    const attempts = [
      { x: 0, y: 0, size: Math.min(width, height), square: false },
      { x: Math.max(0, Math.floor((width - Math.min(width, height) * 0.92) / 2)), y: Math.max(0, Math.floor((height - Math.min(width, height) * 0.92) / 2)), size: Math.floor(Math.min(width, height) * 0.92), square: true },
      { x: Math.max(0, Math.floor((width - Math.min(width, height) * 0.76) / 2)), y: Math.max(0, Math.floor((height - Math.min(width, height) * 0.76) / 2)), size: Math.floor(Math.min(width, height) * 0.76), square: true },
      { x: Math.max(0, Math.floor((width - Math.min(width, height) * 0.58) / 2)), y: Math.max(0, Math.floor((height - Math.min(width, height) * 0.58) / 2)), size: Math.floor(Math.min(width, height) * 0.58), square: true },
    ];

    for (const attempt of attempts) {
      const frameWidth = attempt.square ? Math.min(width - attempt.x, Math.max(80, attempt.size)) : width;
      const frameHeight = attempt.square ? Math.min(height - attempt.y, Math.max(80, attempt.size)) : height;
      const frame = attempt.square
        ? context.getImageData(attempt.x, attempt.y, frameWidth, frameHeight)
        : context.getImageData(0, 0, width, height);
      const decoded = decodeFrame(frame);
      if (decoded) return decoded;
    }
    return null;
  }

  async function readQrWithNativeDetector(source: CanvasImageSource): Promise<string | null> {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) return null;
    if (!barcodeDetectorRef.current) {
      try {
        barcodeDetectorRef.current = new Detector({ formats: ['qr_code'] });
      } catch {
        barcodeDetectorRef.current = null;
        return null;
      }
    }
    if (!barcodeDetectorRef.current) return null;
    try {
      const detections = await barcodeDetectorRef.current.detect(source);
      if (!detections?.length) return null;
      const first = detections.find((item: any) => typeof item?.rawValue === 'string' && item.rawValue.trim().length > 0);
      return first?.rawValue ?? null;
    } catch {
      return null;
    }
  }

  async function scanQrImageFile(file: File) {
    setCameraStatus('Analyse de l image QR...');
    setScanResult(null);
    stopCamera();
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas indisponible');
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const scannedPayload = (await readQrWithNativeDetector(canvas)) ?? readQrFromCanvas(context, canvas.width, canvas.height);
      if (!scannedPayload) {
        setCameraStatus('Aucun QR detecte dans cette image. Essayez une photo plus nette et bien cadree.');
        return;
      }
      setManualPayload(scannedPayload);
      setCameraStatus('QR image detecte et verifie.');
      await validate(scannedPayload);
    } catch {
      setCameraStatus('Impossible de lire cette image QR.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function scanCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('Camera non disponible. Verifiez HTTPS/localhost et les permissions.');
      return;
    }
    stopCamera();
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (cameraError) {
        if (cameraError instanceof DOMException && cameraError.name === 'NotAllowedError') throw cameraError;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();
      setIsScanning(true);
      setCameraStatus('Camera active. Placez le QR dans le cadre.');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      const tick = async () => {
        if (!videoRef.current || !context || !streamRef.current) return;
        const currentVideo = videoRef.current;
        if (currentVideo.readyState === currentVideo.HAVE_ENOUGH_DATA && currentVideo.videoWidth > 0) {
          canvas.width = currentVideo.videoWidth;
          canvas.height = currentVideo.videoHeight;
          context.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
          const scannedPayload = (await readQrWithNativeDetector(canvas)) ?? readQrFromCanvas(context, canvas.width, canvas.height);
          if (scannedPayload) {
            setManualPayload(scannedPayload);
            setCameraStatus('QR capture et verifie.');
            stopCamera();
            await validate(scannedPayload);
            return;
          }
        }
        scanFrameRef.current = requestAnimationFrame(tick);
      };

      scanFrameRef.current = requestAnimationFrame(tick);
    } catch (caught) {
      stopCamera();
      if (caught instanceof DOMException && caught.name === 'NotAllowedError') {
        setCameraStatus('Permission camera refusee. Autorisez la camera pour ce site.');
      } else {
        setCameraStatus('Impossible d ouvrir la camera. Verifiez les permissions du navigateur.');
      }
    }
  }

  return (
    <Panel title={title} icon={ScanLine} wide>
      <div className="qr-layout">
        <div className="qr-box">
          {qrUrl ? <img src={qrUrl} alt="QR integrity payload" /> : <EmptyState text="Aucun QR disponible pour cette selection." />}
        </div>
        <div className="qr-tools">
          <div className="inline-form">
            <input value={manualPayload} onChange={(event) => setManualPayload(event.target.value)} placeholder="Coller le payload QR scanne" />
            <button className="primary-button" onClick={() => validate(manualPayload)} disabled={!manualPayload}>Verifier</button>
          </div>
          <div className="qr-actions">
            <button className="secondary-button" onClick={scanCamera}>
              <ScanLine size={16} />
              {isScanning ? 'Scanner actif' : 'Scanner camera'}
            </button>
            <button className="secondary-button" onClick={() => fileInputRef.current?.click()}>
              <FileText size={16} />
              Importer image QR
            </button>
            {isScanning && (
              <button className="ghost-inline-button" onClick={stopCamera}>
                Arreter camera
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void scanQrImageFile(file);
            }}
          />
          <video ref={videoRef} className={`qr-video ${isScanning ? 'active' : ''}`} muted playsInline />
          {cameraStatus && <small>{cameraStatus}</small>}
          {scanResult && (
  <div className="qr-result">
    <div className="qr-result-head">
      <strong>{scanResult.step}</strong>
      <span className={scanResult.store_verified ? 'status-pill ok' : 'status-pill warning'}>
        {scanResult.store_verified ? 'Données retrouvées' : 'Signature seule'}
      </span>
    </div>

    <div className="qr-result-grid">
      <span>Référence</span><strong>{scanResult.ref_id}</strong>
      <span>Acteur</span><strong>{scanResult.actor}</strong>
      <span>Lots</span><strong>{scanResult.lot_ids?.join(', ') || scanResult.lot_id || 'n/a'}</strong>
      <span>Produit le</span><strong>{when(scanResult.produced_at)}</strong>
    </div>

    {scanResult.record && Object.keys(scanResult.record).length > 0 && (
      <div className="qr-record-block">
        <p className="qr-record-label">Données complètes (non hashées)</p>
        <div className="qr-record-grid">
          {Object.entries(scanResult.record).map(([key, value]) => {
            const display =
              value === null || value === undefined ? '—'
              : typeof value === 'object' ? JSON.stringify(value, null, 2)
              : String(value);
            const isBlock = display.length > 60 || display.includes('\n');
            return (
              <Fragment key={key}>
                <span className="qr-record-key">{key.replace(/_/g, ' ')}</span>
                {isBlock
                  ? <pre className="qr-record-pre">{display}</pre>
                  : <strong className="qr-record-val">{display}</strong>}
              </Fragment>
            );
          })}
        </div>
      </div>
    )}

    <small>{scanResult.message}</small>
  </div>
)}
        </div>
      </div>
    </Panel>
  );
}

function Panel({ title, icon: Icon, children, wide = false }: { title: string; icon: typeof Boxes; children: React.ReactNode; wide?: boolean }) {
  return (
    <article className={`panel ${wide ? 'wide' : ''}`}>
      <div className="panel-title">
        <Icon size={19} />
        <h3>{title}</h3>
      </div>
      {children}
    </article>
  );
}

function ActionForm({ fields, onSubmit, button, busy, disabled }: { fields: { name: string; label: string; defaultValue: string; type?: string; options?: { value: string; label: string }[] }[]; onSubmit: (values: Record<string, string>) => void; button: string; busy: boolean; disabled?: boolean }) {
  return (
    <form
      className="action-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit(Object.fromEntries(form.entries()) as Record<string, string>);
      }}
    >
      {fields.map((field) => (
        <label key={field.name}>
          {field.label}
          {field.options ? (
            <select name={field.name} defaultValue={field.defaultValue}>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <input name={field.name} type={field.type ?? 'text'} defaultValue={field.defaultValue} step={field.type === 'number' ? '0.1' : undefined} />
          )}
        </label>
      ))}
      <button className="primary-button wide" disabled={busy || disabled}>
        <CheckCircle2 size={16} />
        {button}
      </button>
    </form>
  );
}

function LotSelect({ lots, value, onChange, empty }: { lots: StockLot[]; value: string; onChange: (value: string) => void; empty: string }) {
  if (lots.length === 0) return <EmptyState text={empty} />;
  return (
    <select value={value || lots[0].lot_id} onChange={(event) => onChange(event.target.value)} className="select-field">
      {lots.map((lot) => (
        <option key={lot.lot_id} value={lot.lot_id}>
          {lot.lot_id} - {statusLabels[lot.status] ?? lot.status} - {kg(lot.observed_weight_kg)}
        </option>
      ))}
    </select>
  );
}

function BdcSelect({ bdcs, value, onChange, empty }: { bdcs: BdcRecord[]; value: string; onChange: (value: string) => void; empty: string }) {
  if (bdcs.length === 0) return <EmptyState text={empty} />;
  return (
    <select value={value || bdcs[0].bdc_id} onChange={(event) => onChange(event.target.value)} className="select-field">
      {bdcs.map((bdc) => (
        <option key={bdc.bdc_id} value={bdc.bdc_id}>
          {bdc.bdc_id} - {bdc.destination_stage ?? bdc.kind} - {kg(bdc.total_weight_kg)}
        </option>
      ))}
    </select>
  );
}

function BdcPanel({ title, bdcs }: { title: string; bdcs: BdcRecord[] }) {
  return (
    <Panel title={title} icon={FileText} wide>
      <div className="bdc-grid">
        {bdcs.map((bdc) => (
          <article key={bdc.bdc_id} className="bdc-card">
            <div>
              <strong>{bdc.bdc_id}</strong>
              <span>{bdc.kind} vers {bdc.destination_stage ?? 'n/a'}</span>
            </div>
            <small>{bdc.lot_ids.join(', ')}</small>
            <div className="bdc-meta">
              <span>{kg(bdc.total_weight_kg)}</span>
              <span>{pct(bdc.humidity_pct)}</span>
              <span>{statusLabels[bdc.status] ?? bdc.status}</span>
            </div>
          </article>
        ))}
        {bdcs.length === 0 && <EmptyState text="Aucun BDC a afficher." />}
      </div>
    </Panel>
  );
}

function Timeline({ events }: { events: TraceabilityEvent[] }) {
  if (events.length === 0) return <EmptyState text="Entrez un ID lot pour afficher la timeline." />;
  return (
    <div className="timeline">
      {events.map((event, index) => (
        <article key={`${event.event_type}-${index}`}>
          <span />
          <div>
            <strong>{event.event_type}</strong>
            <small>{event.actor} - {when(event.occurred_at)}</small>
            <pre>{JSON.stringify(event.details, null, 2)}</pre>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function localDateTime(hoursFromNow: number): string {
  const value = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}
