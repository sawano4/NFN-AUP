export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

export type Role =
  | 'agent_collecteur'
  | 'responsable_depot'
  | 'responsable_laverie'
  | 'transformateur_T1'
  | 'transformateur_T2'
  | 'admin_NFN';

export type UserProfile = {
  user_id: string;
  email: string;
  name: string;
  role: Role;
  site_id?: string | null;
  site_name?: string | null;
};

export type OperatorSite = {
  site_id: string;
  name: string;
  site_type: 'depot' | 'laverie' | 'transformer_t1' | 'transformer_t2';
  wilaya?: string | null;
  commune?: string | null;
  address?: string | null;
  contact_email?: string | null;
  active: boolean;
  created_at: string;
};

export type LotStatus =
  | 'awaiting_depot_receipt'
  | 'at_depot'
  | 'classified'
  | 'in_transit_laundry'
  | 'at_laundry'
  | 'washed'
  | 'in_transit_transformer'
  | 'delivered';

export type StockLot = {
  lot_id: string;
  source_id: string;
  source_name: string;
  status: LotStatus;
  observed_weight_kg: number;
  estimated_weight_kg?: number | null;
  current_site_id?: string | null;
  current_site_name?: string | null;
  details?: Record<string, unknown>;
  qr_payload?: string | null;
  storage_zone?: string | null;
  arrival_condition?: string | null;
  classification?: string | null;
  vm_percent?: number | null;
  fiber_state?: string | null;
  color?: string | null;
  next_allowed_actions: string[];
};

export type BdcRecord = {
  bdc_id: string;
  lot_ids: string[];
  total_weight_kg: number;
  humidity_pct: number;
  laundry_name: string;
  transporteur_email: string;
  destination_email: string;
  expected_delivery_at: string;
  pdf_url: string;
  kind: 'laundry' | 'transformer';
  status: 'issued' | 'closed';
  source_stage?: string | null;
  destination_stage?: string | null;
  source_site_id?: string | null;
  destination_site_id?: string | null;
  certificate_id?: string | null;
  previous_hash?: string | null;
  integrity_hash?: string | null;
  qr_payload?: string | null;
  closed_at?: string | null;
  created_at: string;
};

export type AlertRecord = {
  alert_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  lot_id?: string | null;
  message: string;
  actors: string[];
  created_at: string;
  resolved_at?: string | null;
  metadata: Record<string, unknown>;
};

export type TraceabilityEvent = {
  event_type: string;
  actor: string;
  occurred_at: string;
  lot_id?: string | null;
  previous_hash?: string | null;
  integrity_hash?: string | null;
  qr_payload?: string | null;
  details: Record<string, unknown>;
};

export type QrScanResult = {
  valid: boolean;
  ref_id: string;
  step: string;
  lot_id?: string | null;
  lot_ids: string[];
  previous_hash?: string | null;
  integrity_hash: string;
  produced_at: string;
  actor: string;
  message: string;
  store_verified: boolean;
  decoded_payload: Record<string, unknown>;
  record: Record<string, unknown>;
};

export type PolicyStatus = {
  thresholds: Record<string, number>;
  depot_capacity: {
    site_id: string;
    site_name?: string | null;
    current_weight_kg: number;
    max_storage_kg: number;
    utilization_pct: number;
    breached: boolean;
  }[];
  overdue_lots: {
    lot_id: string;
    status: string;
    site_id?: string | null;
    age_hours: number;
    max_hours: number;
  }[];
};

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload.detail === 'string' ? payload.detail : response.statusText;
    throw new Error(detail || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const demoUsers = [
  { label: 'Depot', email: 'depot@nfn.example.com', password: 'depot123', role: 'responsable_depot' as Role },
  { label: 'Laverie', email: 'laundry@nfn.example.com', password: 'laundry123', role: 'responsable_laverie' as Role },
  { label: 'T1', email: 't1@nfn.example.com', password: 't1123', role: 'transformateur_T1' as Role },
  { label: 'T2', email: 't2@nfn.example.com', password: 't2123', role: 'transformateur_T2' as Role },
  { label: 'Admin', email: 'admin@nfn.example.com', password: 'admin123', role: 'admin_NFN' as Role },
];

export const api = {
  login(email: string, password: string) {
    return request<Tokens>('/auth/login', { method: 'POST', body: { email, password } });
  },
  me(token: string) {
    return request<UserProfile>('/auth/me', { token });
  },
  pendingReceipts(token: string) {
    return request<StockLot[]>('/operator/depot/pending-receipts', { token });
  },
  sites(token: string, siteType?: string) {
    const suffix = siteType ? `?site_type=${encodeURIComponent(siteType)}` : '';
    return request<OperatorSite[]>(`/operator/sites${suffix}`, { token });
  },
  createSite(token: string, body: unknown) {
    return request<OperatorSite>('/operator/admin/sites', { method: 'POST', token, body });
  },
  createUser(token: string, body: unknown) {
    return request<UserProfile>('/operator/admin/users', { method: 'POST', token, body });
  },
  users(token: string) {
    return request<UserProfile[]>('/operator/admin/users', { token });
  },
  policies(token: string) {
    return request<PolicyStatus>('/operator/policies', { token });
  },
  updatePolicies(token: string, body: unknown) {
    return request<Record<string, number>>('/operator/admin/policies', { method: 'PATCH', token, body });
  },
  createDepotLot(token: string, body: unknown) {
    return request<StockLot>('/operator/depot/lots', { method: 'POST', token, body });
  },
  depotStock(token: string) {
    return request<StockLot[]>('/operator/depot/stock', { token });
  },
  receiveDepot(token: string, body: unknown) {
    return request('/operator/depot/receipts', { method: 'POST', token, body });
  },
  classify(token: string, body: unknown) {
    return request('/operator/depot/classifications', { method: 'POST', token, body });
  },
  stockTemperature(token: string, body: unknown) {
    return request('/operator/depot/stock-temperatures', { method: 'POST', token, body });
  },
  createLaundryShipment(token: string, body: unknown) {
    return request<BdcRecord>('/operator/depot/laundry-shipments', { method: 'POST', token, body });
  },
  incomingLaundry(token: string) {
    return request<BdcRecord[]>('/operator/laverie/incoming-bdcs', { token });
  },
  laundryReceipt(token: string, body: unknown) {
    return request('/operator/laverie/receipts', { method: 'POST', token, body });
  },
  washRun(token: string, body: unknown) {
    return request('/operator/laverie/wash-runs', { method: 'POST', token, body });
  },
  laundryOutput(token: string, body: unknown) {
    return request<{ transformer_bdc_id: string; certificate_id: string }>('/operator/laverie/outputs', {
      method: 'POST',
      token,
      body,
    });
  },
  incomingTransformer(token: string) {
    return request<BdcRecord[]>('/operator/transformer/incoming-bdcs', { token });
  },
  transformerReceipt(token: string, body: unknown) {
    return request('/operator/transformer/receipts', { method: 'POST', token, body });
  },
  t1Production(token: string, body: unknown) {
    return request('/operator/transformer/t1-productions', { method: 'POST', token, body });
  },
  t2Reception(token: string, body: unknown) {
    return request('/operator/transformer/t2-receptions', { method: 'POST', token, body });
  },
  bdcs(token: string) {
    return request<BdcRecord[]>('/operator/bdcs', { token });
  },
  openBdcs(token: string) {
    return request<BdcRecord[]>('/operator/bdcs/open', { token });
  },
  alerts(token: string) {
    return request<AlertRecord[]>('/admin/alerts', { token });
  },
  traceability(token: string, lotId: string) {
    return request<TraceabilityEvent[]>(`/operator/lots/${encodeURIComponent(lotId)}/traceability`, { token });
  },
  scanQr(token: string, body: unknown) {
    return request<QrScanResult>('/operator/qr/scan', { method: 'POST', token, body });
  },
  async reportCsv(token: string, scope: string) {
    const response = await fetch(`${API_BASE_URL}/operator/reports/${encodeURIComponent(scope)}.csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(response.statusText);
    return response.text();
  },
  mobileBootstrap(token: string) {
    return request<{ reserved_lot_ids: string[] }>('/mobile/bootstrap', { token });
  },
  mobileSync(token: string, body: unknown) {
    return request('/mobile/sync/batch', { method: 'POST', token, body });
  },
};
