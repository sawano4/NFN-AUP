# NFN AUP MVP

Backend and web-app MVP for the NFN wool traceability platform. The repo currently focuses on the operator chain:

1. depot reception and stock control
2. laundry reception, washing, output and purity certificates
3. transformer T1/T2 reception and final processing
4. admin inspection, policies, SLA, alerts, documents and users

The implementation is intentionally pragmatic for an MVP: FastAPI services are separated at the application layer, while the domain engine is centralized in `backend/packages/nfn_shared/platform_state.py`. The same engine can run in memory for quick local testing or persist its state in PostgreSQL via `psycopg`.

## What Is Included

- FastAPI backend services mounted into a local dev stack
- React operator web app with role-based screens
- QR code generation, camera/import scanning, integrity validation and BDD audit ingestion
- Multi-site operator model: multiple depots, laundries, T1 and T2 transformers
- SLA and policy monitoring: depot capacity, depot storage time, laundry processing time, BDC deadlines, full lot transformation SLA
- Operator audits for entries, outputs and QR scans
- Alerts for weight gaps, hot stock, low washing yield, mass-balance gaps, overdue BDC and SLA breaches
- CSV report exports for operator scopes
- Synthetic data seeding script for demos and KPI-rich dashboards

## Repo Layout

```text
backend/
  dev_stack.py                         # mounts every backend service locally
  packages/nfn_shared/                 # contracts, auth, state engine, persistence
  services/
    auth_service/
    source_service/
    mobile_service/
    admin_service/
    operator_service/
    alert_service/
    document_service/
    notification_service/

apps/
  operator-web/                        # main operator/admin React app
  admin-web/                           # scaffold
  source-web/                          # scaffold
  android-agent/                       # Kotlin Android scaffold

tools/
  seed_operator_synthetic.py           # fills the operator backend with synthetic data
```

## Backend Setup

Install dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Run the local composed backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.dev_stack:app --host 127.0.0.1 --port 8000 --reload
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Mounted paths:

- `/auth`
- `/source`
- `/mobile`
- `/admin`
- `/operator`
- `/alerts`
- `/documents`
- `/notifications`

## PostgreSQL State

To persist the MVP state in PostgreSQL, set `DATABASE_URL` before starting the API:

```powershell
$env:DATABASE_URL = "postgresql://nfn:nfn@localhost:5432/nfn"
.\.venv\Scripts\python.exe -m uvicorn backend.dev_stack:app --host 127.0.0.1 --port 8000 --reload
```

When `DATABASE_URL` is present, the shared platform state is saved in the PostgreSQL table `app_state` as JSONB, keyed by `platform_state_v1`. This keeps the current architecture lightweight while allowing the whole MVP state to survive restarts.

Docker Compose already passes:

```text
DATABASE_URL=postgresql://nfn:nfn@postgres:5432/nfn
```

## Operator Web App

Install and run:

```powershell
cd apps\operator-web
npm install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5174/
```

Useful scripts:

```powershell
npm.cmd run type-check
npm.cmd run build
npm.cmd run preview
```

The operator web app supports:

- depot role: add lots, receive lots, classify stock, record temperature, create laundry BDC, scan QR, export reports
- laundry role: receive BDC, run wash cycles, record outputs, create certificates, route to T1/T2, scan QR
- T1 role: receive transformer BDC, confirm price/weight, create production records
- T2 role: receive transformer BDC, confirm price/weight, complete reception checklist
- admin role: inspect all sites, users, alerts, BDC, SLA, policies and operator audits

## Demo Users

Seeded users:

| Role | Email | Password |
| --- | --- | --- |
| Agent collecteur | `agent@nfn.example.com` | `agent123` |
| Depot | `depot@nfn.example.com` | `depot123` |
| Laverie | `laundry@nfn.example.com` | `laundry123` |
| Transformateur T1 | `t1@nfn.example.com` | `t1123` |
| Transformateur T2 | `t2@nfn.example.com` | `t2123` |
| Admin | `admin@nfn.example.com` | `admin123` |

The synthetic seed script also creates new operator accounts. Their password is always:

```text
seed1234
```

## Synthetic Data

Start the backend first, then run:

```powershell
.\.venv\Scripts\python.exe tools\seed_operator_synthetic.py
```

Optional custom API URL:

```powershell
.\.venv\Scripts\python.exe tools\seed_operator_synthetic.py --base-url http://127.0.0.1:8000
```

The seed creates:

- several depots, laundries and transformers
- role-bound user accounts
- pending lots, depot stock, classified lots, lots in laundry, lots in transformer and delivered lots
- open and closed BDC
- QR scans ingested as operator audits
- SLA deadlines and breached cases
- stock temperature alerts, weight gap alerts, washing yield alerts and mass-balance alerts

## Operator Flow

```mermaid
flowchart LR
  A["Depot creates or receives lot"] --> B["Depot classifies stock"]
  B --> C["Depot issues laundry BDC + QR"]
  C --> D["Laundry scans QR and receives BDC"]
  D --> E["Laundry wash run"]
  E --> F["Laundry output + purity certificate"]
  F --> G["Transformer BDC + QR"]
  G --> H["T1/T2 scans QR and confirms receipt"]
  H --> I["T1 production or T2 checklist"]
  I --> J["Final lot closed with traceability"]
```

Each transition records traceability events with actor, timestamp, weights, quality parameters, integrity hash and previous hash where relevant. Corrections and sensitive changes require reasons, and invalid transitions are blocked by the shared domain engine.

## QR Integrity

QR payloads encode the output of the previous step. The backend validates:

- payload signature
- expected reference ID
- expected step when required
- stored record hash when the record exists in the current environment

Scanning from the operator web app uses `/operator/qr/ingest`, which validates the QR and creates an `OperatorAuditRecord` in the backend. The UI then displays the decoded data, stored record, audit ID and SLA status.

## SLA And Alerts

Policy thresholds are configurable by admin through `/operator/admin/policies`.

Tracked policies include:

- max depot storage capacity in kg
- max depot storage time
- max laundry processing time
- full lot transformation SLA
- BDC overdue/confirmation delays
- stock temperature threshold
- receipt weight gap threshold
- minimum washing yield per wool type

SLA and alert data is exposed through:

- `/operator/policies`
- `/operator/audits`
- `/admin/alerts`
- `/operator/bdcs/open`

## Reports

CSV exports are available at:

```text
/operator/reports/{scope}.csv
```

The frontend exposes report downloads per operator context. Reports include lot, BDC, status, source, weight, humidity, classification, yield, mass-balance gap, alert count, last event and integrity hash where available.

## Tests

Backend tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Operator web type-check:

```powershell
cd apps\operator-web
npm.cmd run type-check
```

Recommended local verification before pushing:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd apps\operator-web
npm.cmd run type-check
```

## Current Architecture Notes

- `operator_service` is a single backend service with logical depot/laundry/transformer modules.
- `platform_state` is the source of truth for domain rules, traceability and audit behavior.
- documents, alerts and notifications are reused as platform capabilities rather than reimplemented inside the operator app.
- PostgreSQL persistence currently stores the state snapshot. A fuller relational ORM layer can be added later without changing the public API shape.
- The frontend palette uses agricultural green `#228B34`, orange `#E88E00`, and neutral white/gray/dark backgrounds.
