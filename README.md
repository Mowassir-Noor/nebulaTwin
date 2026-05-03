# NebulaTwin Pro

**Cloud-based Digital Twin SaaS Platform** — Full-stack NestJS + React application for industrial IoT monitoring, 3D visualization, and real-time sensor management.

**Version:** 0.4.0 (Models + Collaboration)

## Tech Stack

**Backend:** NestJS, TypeScript, Prisma, PostgreSQL + TimescaleDB, Redis, Kafka, MQTT (Mosquitto), Socket.IO, JWT + Google OAuth

**Frontend:** React 19, Vite, Tailwind CSS, Zustand, TanStack Query, Three.js, Recharts, Socket.IO Client

**3D Models:** Upload, version, rollback, and bind sensors to GLB / GLTF / OBJ models in the browser.

**Infrastructure:** Docker Compose, NGINX, Node.js 20

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### 1. Start Infrastructure
```bash
docker-compose up -d postgres redis kafka mosquitto
```

### 2. Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### 3. Setup Database
```bash
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 4. Run the App
```bash
# Backend (port 3000)
npm run start:dev

# Frontend (port 5173) — in a separate terminal
cd frontend && npm run dev
```

- **API:** http://localhost:3000/api/v1
- **Frontend:** http://localhost:5173
- **Swagger:** http://localhost:3000/docs
- **Health:** http://localhost:3000/api/v1/health

### 3D Model Viewer Notes
- Supported upload formats: `.glb`, `.gltf`, `.obj`
- Model files are served from `/uploads` by the backend
- In frontend dev, `vite.config.ts` proxies `/uploads` to `http://localhost:3000`
- If the viewer shows a blank panel, verify the model URL returns the file content and not HTML

### Full Docker Deploy
```bash
docker-compose up -d
```

### Default Login
- **Email:** `admin@nebulatwin.io`
- **Password:** `admin123`

## API Endpoints

### Auth
- `POST /auth/register` — Register
- `POST /auth/login` — Login → JWT tokens
- `GET  /auth/google` — Google OAuth
- `POST /auth/refresh` — Refresh token
- `POST /auth/logout` — Logout

### Digital Twins
- `POST /twins` · `GET /twins` · `GET /twins/:id` · `PATCH /twins/:id` · `DELETE /twins/:id`

### Assets
- `POST /assets` · `GET /assets?twinId=` · `GET /assets/:id` · `PATCH /assets/:id` · `DELETE /assets/:id`

### Sensors
- `POST /sensors` · `GET /sensors` · `GET /sensors/:id` · `PATCH /sensors/:id` · `DELETE /sensors/:id`

### Sensor Control *(ADMIN, MANAGER only)*
- `POST /sensors/:id/override` — Set manual override `{ "value": 72.5 }`
- `POST /sensors/:id/override/clear` — Clear override → REAL mode
- `POST /sensors/:id/stream` — Start stream `{ "pattern": "SINE", "interval_ms": 1000, "min": 10, "max": 90 }`
- `POST /sensors/:id/stop` — Stop stream
- `POST /sensors/:id/bind/:modelPartId` · `POST /sensors/:id/unbind` — 3D model binding

### Data Ingestion
- `POST /ingest` — Single data point → `{ "status": "accepted" }` or `{ "status": "rejected", "reason": "..." }`
- `POST /ingest/batch` — Batch ingest
- `GET  /ingest/metrics` — Ingestion stats *(ADMIN, MANAGER)*

### Alerts *(v0.2.0)*
- `GET /alerts` · `GET /alerts/unacknowledged` · `GET /alerts/stats` · `GET /alerts/sensor/:sensorId`
- `POST /alerts/:id/acknowledge` · `POST /alerts/acknowledge-all`

### Health *(v0.2.0, unauthenticated)*
- `GET /health` — Full health check (DB, Redis, TimescaleDB with latency)
- `GET /health/live` — Liveness probe
- `GET /health/ready` — Readiness probe

### Analytics
- `GET /analytics/sensors/:id/history` · `GET /analytics/sensors/:id/latest` · `GET /analytics/sensors/:id/aggregated`

### 3D Models
- `POST /models` — Upload a model with `file` + `twinId`
- `POST /models/:id/version` — Upload a new version
- `GET /models` · `GET /models/:id` · `GET /models/:id/versions`
- `POST /models/:id/rollback` · `PATCH /models/:id` · `DELETE /models/:id`
- `POST /models/:id/restore` · `DELETE /models/:id/permanent`
- `GET /models/:id/bound-sensors` — Count bound sensors

> All endpoints prefixed with `/api/v1`

### WebSocket (Socket.IO)
```js
const socket = io('http://localhost:3000/realtime');
socket.emit('subscribe:tenant', { tenantId: '...' });
socket.on('sensor:data', (data) => console.log(data));
socket.on('alert', (alert) => console.log(alert));
```

## Sensor Modes (Single Source of Truth)

| Mode | Data Source | External Ingestion |
|------|------------|-------------------|
| `REAL` | HTTP/MQTT ingestion | Accepted |
| `MANUAL` | Manual override value | Rejected |
| `STREAM` | Simulated stream engine | Rejected |

Only one mode active at a time. Override stops streams; streams clear overrides.

## Stream Patterns
- `CONSTANT` — Fixed midpoint value
- `LINEAR_INCREASE` / `LINEAR_DECREASE` — Ramp up/down (cycles every 100 ticks)
- `SINE` — Sine wave oscillation
- `RANDOM` — Random noise within range

## v0.2.0 Hardening

### Backend
- **Sensor mode enforcement** — `REAL`, `MANUAL`, `STREAM` with mutual exclusion
- **Alert system** — Configurable min/max thresholds, alerts broadcast via WebSocket
- **Ingestion rate limiting** — 20 requests/sec per sensor (Redis sliding window)
- **WebSocket throttling** — 100ms flush interval, latest-wins per room
- **Health endpoints** — `/health`, `/health/live`, `/health/ready`
- **RBAC tightened** — Override/stream endpoints restricted to ADMIN + MANAGER
- **Duplicate prevention** — `ON CONFLICT DO NOTHING` on TimescaleDB inserts
- **Redis psubscribe** — Pattern-based subscriptions for sensors and alerts

### Frontend
- **ErrorBoundary** — Catches and displays errors with retry
- **Toast notifications** — Success/error/warning/info with auto-dismiss
- **ConnectionStatus** — WebSocket state indicator in header
- **Auto-reconnect** — Exponential backoff (1s–10s), subscription replay
- **Alerts page** — Filter, acknowledge, real-time stats
- **API retry** — Auto-retry on 5xx errors

### Tests
```bash
npm test
```
19 tests across 3 suites — sensors (8), ingestion (6), alerts (5)

## Project Structure

```
src/
├── main.ts
├── app.module.ts
├── database/            # Prisma + TimescaleDB services
├── common/
│   ├── redis/           # Redis cache, pub/sub, psubscribe
│   ├── event-bus/       # Event bus (Redis-backed)
│   ├── decorators/      # @CurrentUser, @Roles
│   └── guards/          # JWT, Roles, Tenant guards
└── modules/
    ├── auth/            # JWT + Google OAuth
    ├── users/           # User CRUD
    ├── tenants/         # Multi-tenant management
    ├── twins/           # Digital twin CRUD
    ├── assets/          # Asset hierarchy
    ├── sensors/         # Sensors + override + streams + mode enforcement
    ├── ingestion/       # HTTP + MQTT ingestion, rate limiting, metrics
    ├── realtime/        # WebSocket gateway with throttling
    ├── analytics/       # Time-series queries
    ├── alerts/          # Alert system (thresholds, acknowledgment)
    └── health/          # Health probes (liveness, readiness)

frontend/src/
├── App.tsx              # Router + ErrorBoundary + ToastContainer
├── pages/               # Dashboard, Twins, Viewer, Sensors, Testing, Alerts
├── components/
│   ├── ui/              # Button, Card, Input, Badge, ErrorBoundary, Toast, ConnectionStatus
│   ├── layout/          # AppLayout (sidebar + header), Sidebar
│   ├── 3d/              # SceneViewer, DemoFactory
│   └── sensors/         # SensorBindingPanel
├── store/               # Zustand: auth, twin, sensor, viewer
├── services/            # API (axios + retry), WebSocket (reconnect + alerts)
└── types/               # TypeScript interfaces
```

See [documentation.md](./documentation.md) for comprehensive technical documentation.
