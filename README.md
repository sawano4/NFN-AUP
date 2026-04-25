# NFN MVP

Service-based MVP for the NFN platform with:

- 8 backend services implemented as separate FastAPI apps
- a mounted local dev stack for fast verification
- a Kotlin Android mobile app scaffold for the offline-first agent workflow
- React web app scaffolds for admin, source, and operator apps

## Repo layout

- `backend/services/*`: individual backend services
- `backend/packages/nfn_shared`: shared contracts, auth, demo state, and domain helpers
- `backend/dev_stack.py`: local composition app mounting every backend service
- `apps/android-agent`: native Kotlin Android app scaffold
- `apps/*-web`: React app scaffolds

## Local backend setup

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.dev_stack:app --reload
```

Mounted service paths in the dev stack:

- `/auth`
- `/source`
- `/mobile`
- `/admin`
- `/operator`
- `/alerts`
- `/documents`
- `/notifications`

### PostgreSQL-backed state

Set `DATABASE_URL` before starting the API to run the whole MVP against PostgreSQL with `psycopg`:

```powershell
$env:DATABASE_URL = "postgresql://nfn:nfn@localhost:5432/nfn"
.\.venv\Scripts\python.exe -m uvicorn backend.dev_stack:app --reload
```

When enabled, backend state is saved in PostgreSQL table `app_state` as JSONB (single-row snapshot keyed by `platform_state_v1`). This persists the shared domain engine used by auth, source, mobile, admin, operator, alert, document, and notification flows while preserving the current relational schema for the next ORM migration step.

Docker Compose already passes `DATABASE_URL=postgresql://nfn:nfn@postgres:5432/nfn` to every backend service.

## Test

```powershell
.\.venv\Scripts\python.exe -m pytest
```

## Seeded demo users

- `agent@nfn.example.com` / `agent123`
- `depot@nfn.example.com` / `depot123`
- `admin@nfn.example.com` / `admin123`

## Notes

- The backend services are separated at the application layer and can be containerized individually.
- The current Python implementation keeps a shared demo domain model and can run without Docker, PostgreSQL, or Redis on PATH. If `DATABASE_URL` is set, that shared state is persisted in PostgreSQL.
- `docker-compose.yml` is included as the target runtime shape for the MVP.
