# NebulaTwin Pro — Complete Documentation

**Cloud-Based Digital Twin SaaS Platform**
Version: 0.2.0 (Hardened) | Last Updated: May 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Backend (NestJS)](#5-backend-nestjs)
   - 5.1 [Modules](#51-modules)
   - 5.2 [Database Schema](#52-database-schema)
   - 5.3 [API Endpoints](#53-api-endpoints)
   - 5.4 [Authentication & Authorization](#54-authentication--authorization)
   - 5.5 [Real-Time System](#55-real-time-system)
   - 5.6 [Sensor Streaming Engine](#56-sensor-streaming-engine)
   - 5.7 [Data Ingestion](#57-data-ingestion)
   - 5.8 [Analytics](#58-analytics)
   - 5.9 [Alert System](#59-alert-system)
   - 5.10 [Health & Observability](#510-health--observability)
6. [Frontend (React)](#6-frontend-react)
   - 6.1 [Pages](#61-pages)
   - 6.2 [Components](#62-components)
   - 6.3 [State Management](#63-state-management)
   - 6.4 [Services](#64-services)
7. [Infrastructure & DevOps](#7-infrastructure--devops)
   - 7.1 [Docker Compose Services](#71-docker-compose-services)
   - 7.2 [Dockerfile](#72-dockerfile)
   - 7.3 [NGINX API Gateway](#73-nginx-api-gateway)
8. [Environment Configuration](#8-environment-configuration)
9. [Setup & Running](#9-setup--running)
10. [Seeded Demo Data](#10-seeded-demo-data)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [Security](#12-security)
13. [Production Hardening (v0.2.0)](#13-production-hardening-v020)
14. [Testing](#14-testing)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Project Overview

**NebulaTwin Pro** is a full-stack, cloud-based Digital Twin SaaS platform. It allows industrial users to:

- Create and manage **digital twins** of physical assets (factories, production lines, machines, components)
- Upload and interact with **3D models** in the browser
- Attach **sensors** to machine parts and receive real-time telemetry
- **Simulate sensor data** with configurable patterns (sine, random, linear, constant)
- **Manually override** sensor values for testing
- Receive **real-time alerts** when sensor values breach configurable thresholds
- Visualize data in **real-time dashboards** with charts and 3D color-coded models
- Ingest sensor data via **HTTP** and **MQTT** protocols
- Query **time-series analytics** (history, latest, aggregated buckets)

The platform is **multi-tenant**, supports **RBAC** (Role-Based Access Control), and is designed for horizontal scalability.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (port 80)                          │
│                     API Gateway / Reverse Proxy                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    NestJS Backend (port 3000)                    │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Auth   │ │  Twins  │ │ Sensors  │ │Ingestion │ │Analytics│ │
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │  Users  │ │ Assets  │ │ Realtime │ │ Tenants  │ │ Alerts ││
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘ └────────┘│
│  ┌─────────┐                                                  │
│  │ Health  │                                                  │
│  └─────────┘                                                  │
└──────┬──────────┬──────────┬──────────┬────────────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼────┐
  │Postgres│ │ Redis │ │ Kafka │ │Mosquitto│
  │Timescale│ │       │ │       │ │ (MQTT) │
  └────────┘ └───────┘ └───────┘ └────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  React Frontend (port 5173)                      │
│                                                                  │
│  ┌──────────┐ ┌───────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ │
│  │Dashboard │ │ Twins │ │3D Viewer │ │ Sensors │ │ Testing  │ │
│  └──────────┘ └───────┘ └──────────┘ └─────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────────┐ ┌─────────────┐                │
│  │  Alerts  │ │ErrorBoundary │ │Toast System │                │
│  └──────────┘ └──────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Backend
| Technology | Purpose | Version |
|---|---|---|
| **NestJS** | Application framework | ^10.3.0 |
| **TypeScript** | Language | ^5.3.3 |
| **Prisma** | ORM / database client | ^5.8.0 |
| **PostgreSQL** | Relational database | 16 |
| **TimescaleDB** | Time-series extension | latest-pg16 |
| **Redis** | Caching, pub/sub, event bus | 7-alpine |
| **Apache Kafka** | Event streaming / message broker | 3.7.0 |
| **Mosquitto** | MQTT broker for IoT ingestion | 2 |
| **Socket.IO** | WebSocket real-time gateway | ^10.3.0 |
| **Passport** | Authentication (JWT + Google OAuth) | ^0.7.0 |
| **Swagger** | API documentation | ^7.2.0 |
| **Helmet** | Security headers | ^7.1.0 |

### Frontend
| Technology | Purpose | Version |
|---|---|---|
| **React** | UI framework | ^19.2.5 |
| **TypeScript** | Language | ~6.0.2 |
| **Vite** | Build tool | ^8.0.10 |
| **Tailwind CSS** | Styling | ^4.2.4 |
| **Zustand** | State management | ^5.0.12 |
| **TanStack Query** | Server state / caching | ^5.100.6 |
| **Three.js** | 3D rendering engine | ^0.184.0 |
| **@react-three/fiber** | React Three.js bindings | ^9.6.1 |
| **@react-three/drei** | Three.js helpers / controls | ^10.7.7 |
| **Recharts** | Charts and data visualization | ^3.8.1 |
| **Socket.IO Client** | WebSocket client | ^4.8.3 |
| **Axios** | HTTP client | ^1.15.2 |
| **Lucide React** | Icons | ^1.14.0 |
| **React Router** | Client-side routing | ^7.14.2 |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker Compose** | Container orchestration |
| **NGINX** | API gateway, reverse proxy, rate limiting |
| **Node.js 20** | Runtime (Alpine image) |

---

## 4. Project Structure

### Root
```
nebula/
├── src/                          # Backend source code (NestJS)
├── frontend/                     # Frontend source code (React)
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # Prisma schema definition
│   ├── seed.ts                   # Database seed script
│   └── migrations/               # SQL migrations
├── docker/                       # Docker configuration files
│   ├── nginx/nginx.conf          # NGINX reverse proxy config
│   └── mosquitto/mosquitto.conf  # MQTT broker config
├── docker-compose.yml            # Full infrastructure definition
├── Dockerfile                    # Multi-stage production build
├── .env.example                  # Environment variable template
├── .env                          # Local environment (gitignored)
├── package.json                  # Backend dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
└── nest-cli.json                 # NestJS CLI configuration
```

### Backend (`src/`)
```
src/
├── main.ts                       # Application entry point & bootstrap
├── app.module.ts                 # Root module (imports all feature modules)
│
├── database/                     # Database layer
│   ├── database.module.ts        # Database module (Prisma + TimescaleDB)
│   ├── prisma.service.ts         # Prisma client lifecycle management
│   └── timescale.service.ts      # TimescaleDB raw queries (hypertable)
│
├── common/                       # Shared utilities
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser() param decorator
│   │   └── roles.decorator.ts          # @Roles() method decorator
│   ├── guards/
│   │   ├── roles.guard.ts        # RBAC role guard
│   │   └── tenant.guard.ts       # Tenant isolation guard
│   ├── redis/
│   │   ├── redis.module.ts       # Redis module (ioredis)
│   │   └── redis.service.ts      # Redis get/set/pub/sub service
│   └── event-bus/
│       ├── event-bus.module.ts   # Kafka event bus module
│       └── event-bus.service.ts  # Kafka producer/consumer service
│
└── modules/                      # Feature modules
    ├── auth/                     # Authentication & authorization
    │   ├── auth.module.ts
    │   ├── auth.controller.ts    # Login, register, refresh, logout, Google OAuth
    │   ├── auth.service.ts       # JWT generation, password hashing, Google validation
    │   ├── dto/
    │   │   ├── login.dto.ts      # { email, password }
    │   │   └── register.dto.ts   # { email, password, name, tenantId?, role? }
    │   ├── guards/
    │   │   └── jwt-auth.guard.ts # JWT authentication guard
    │   └── strategies/
    │       ├── jwt.strategy.ts   # JWT Passport strategy
    │       └── google.strategy.ts # Google OAuth Passport strategy
    │
    ├── users/                    # User management
    │   ├── users.module.ts
    │   ├── users.controller.ts   # CRUD, role assignment
    │   └── users.service.ts      # User queries, Google linking
    │
    ├── tenants/                  # Multi-tenant management
    │   ├── tenants.module.ts
    │   ├── tenants.controller.ts # CRUD for tenants
    │   └── tenants.service.ts
    │
    ├── twins/                    # Digital Twin management
    │   ├── twins.module.ts
    │   ├── twins.controller.ts   # CRUD with nested includes
    │   └── twins.service.ts
    │
    ├── assets/                   # Asset hierarchy management
    │   ├── assets.module.ts
    │   ├── assets.controller.ts  # CRUD, root assets, tree queries
    │   └── assets.service.ts
    │
    ├── sensors/                  # Sensor management & control
    │   ├── sensors.module.ts
    │   ├── sensors.controller.ts # CRUD, override, stream, bind/unbind
    │   ├── sensors.service.ts    # Sensor business logic
    │   ├── sensor-stream.service.ts # Simulated data stream engine
    │   └── dto/
    │       ├── create-sensor.dto.ts   # { name, type, unit, assetId? }
    │       ├── override-sensor.dto.ts # { mode, value }
    │       └── start-stream.dto.ts    # { pattern, interval_ms, min, max }
    │
    ├── ingestion/                # Data ingestion (HTTP + MQTT)
    │   ├── ingestion.module.ts
    │   ├── ingestion.controller.ts    # POST /ingest, POST /ingest/batch
    │   ├── ingestion.service.ts       # Validate & store data points
    │   └── mqtt-ingestion.service.ts  # MQTT subscriber → ingestion pipeline
    │
    ├── realtime/                 # WebSocket real-time gateway
    │   ├── realtime.module.ts
    │   ├── realtime.gateway.ts   # Socket.IO gateway (subscribe/broadcast)
    │   └── realtime.service.ts   # Redis pub/sub → WebSocket bridge
    │
    └── analytics/                # Time-series analytics
        ├── analytics.module.ts
        ├── analytics.controller.ts    # History, latest, aggregated endpoints
        └── analytics.service.ts       # TimescaleDB queries with Redis caching
```

### Frontend (`frontend/src/`)
```
frontend/src/
├── main.tsx                      # React entry point
├── App.tsx                       # Router + providers setup
├── index.css                     # Tailwind CSS + custom theme
│
├── types/
│   └── index.ts                  # TypeScript interfaces (User, Twin, Sensor, etc.)
│
├── services/
│   ├── api.ts                    # Axios client + all API functions
│   └── websocket.ts              # Socket.IO client + event subscription
│
├── store/
│   ├── authStore.ts              # Auth state (login, logout, tokens)
│   ├── twinStore.ts              # Twins + assets state
│   ├── sensorStore.ts            # Sensors + realtime values state
│   └── viewerStore.ts            # 3D viewer selection state
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx            # Styled button (variants: primary/secondary/outline/ghost/destructive)
│   │   ├── Card.tsx              # Card + CardHeader + CardTitle + CardContent
│   │   ├── Input.tsx             # Styled input field
│   │   └── Badge.tsx             # Status badge (default/success/warning/danger)
│   ├── layout/
│   │   ├── AppLayout.tsx         # Protected layout with sidebar + outlet
│   │   └── Sidebar.tsx           # Navigation sidebar with icons
│   ├── 3d/
│   │   ├── SceneViewer.tsx       # Three.js canvas with lighting + controls
│   │   └── DemoFactory.tsx       # Interactive 3D factory model
│   └── sensors/
│       └── SensorBindingPanel.tsx # Attach sensor to selected mesh
│
└── pages/
    ├── auth/
    │   └── LoginPage.tsx         # Login form + Google OAuth button
    ├── dashboard/
    │   └── DashboardPage.tsx     # KPI cards + charts + alerts + live values
    ├── twins/
    │   └── TwinsPage.tsx         # Twin list + create form + asset tree
    ├── viewer/
    │   └── ViewerPage.tsx        # 3D viewer + sensor binding panel
    └── sensors/
        ├── SensorsPage.tsx       # Sensor grid with live values
        └── SensorTestingPage.tsx # Full sensor control panel
```

---

## 5. Backend (NestJS)

### 5.1 Modules

| Module | Description |
|---|---|
| `AppModule` | Root module, imports all feature modules, configures throttling and scheduling |
| `DatabaseModule` | Provides `PrismaService` and `TimescaleService` globally |
| `RedisModule` | Provides `RedisService` (ioredis client) globally |
| `EventBusModule` | Kafka producer/consumer for event streaming |
| `AuthModule` | JWT auth, Google OAuth, login/register/refresh/logout |
| `UsersModule` | User CRUD, role management, Google ID linking |
| `TenantsModule` | Tenant CRUD for multi-tenancy |
| `TwinsModule` | Digital twin CRUD with nested asset/model includes |
| `AssetsModule` | Hierarchical asset CRUD (factory → line → machine → component) |
| `SensorsModule` | Sensor CRUD, manual override, stream simulation, model binding |
| `IngestionModule` | HTTP + MQTT data ingestion into TimescaleDB, rate limiting, metrics |
| `RealtimeModule` | Socket.IO WebSocket gateway with throttled broadcast (10 updates/sec per room) |
| `AnalyticsModule` | Time-series queries (history, latest, aggregated with time_bucket) |
| `AlertsModule` | Alert CRUD, acknowledgment, threshold-based alert creation |
| `HealthModule` | Health check endpoints (`/health`, `/health/live`, `/health/ready`) |

### 5.2 Database Schema

**PostgreSQL + TimescaleDB**

#### Prisma-Managed Tables

| Table | Description | Key Fields |
|---|---|---|
| `tenants` | Multi-tenant organizations | id, name |
| `users` | User accounts | id, email, passwordHash, googleId, role, tenantId |
| `digital_twins` | Digital twin definitions | id, name, description, tenantId |
| `assets` | Hierarchical asset tree | id, name, type (FACTORY/LINE/MACHINE/COMPONENT), twinId, parentId |
| `models_3d` | 3D model files | id, fileUrl, format, sizeBytes, meshStructure, twinId |
| `model_parts` | Individual mesh parts of 3D models | id, name, modelId, metadata |
| `sensors` | Sensor definitions + control state | id, name, type, unit, mode, manualValue, stream*, assetId, modelPartId, tenantId |
| `audit_logs` | Activity audit trail | id, action, entity, entityId, details, userId, tenantId |

#### TimescaleDB Hypertable (raw SQL)

| Table | Description | Columns |
|---|---|---|
| `sensor_data` | Time-series sensor readings | time (TIMESTAMPTZ), sensor_id (TEXT), value (DOUBLE PRECISION), metadata (JSONB) |

- Partitioned by `time` using `create_hypertable()`
- Indexed on `(sensor_id, time DESC)`
- Supports `time_bucket()` aggregation queries

#### Enums

| Enum | Values |
|---|---|
| `Role` | ADMIN, MANAGER, OPERATOR, VIEWER |
| `SensorMode` | REAL, MANUAL, **STREAM** |
| `AssetType` | FACTORY, LINE, MACHINE, COMPONENT |
| `StreamPattern` | CONSTANT, LINEAR_INCREASE, LINEAR_DECREASE, SINE, RANDOM |
| `AlertSeverity` | WARNING, CRITICAL |

#### Alert Model (new in v0.2.0)

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `severity` | AlertSeverity | WARNING or CRITICAL |
| `message` | String | Human-readable alert description |
| `value` | Float | The sensor value that triggered the alert |
| `acknowledged` | Boolean | Whether the alert has been acknowledged |
| `sensorId` | FK → Sensor | Sensor that triggered the alert |
| `tenantId` | FK → Tenant | Tenant isolation |
| `createdAt` | DateTime | Timestamp |

#### Sensor Threshold Fields (new in v0.2.0)

| Field | Type | Description |
|---|---|---|
| `alertMinThreshold` | Float? | Minimum threshold — values below trigger alert |
| `alertMaxThreshold` | Float? | Maximum threshold — values above trigger alert |

### 5.3 API Endpoints

Base URL: `/api/v1`

#### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login with email/password → returns JWT tokens |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | JWT | Invalidate refresh token |
| GET | `/auth/google` | No | Initiate Google OAuth flow |
| GET | `/auth/google/callback` | No | Google OAuth callback |

**Login Response:**
```json
{
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "ADMIN" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### Tenants
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/tenants` | JWT | ADMIN | Create tenant |
| GET | `/tenants` | JWT | ADMIN | List all tenants |
| GET | `/tenants/:id` | JWT | ADMIN | Get tenant by ID |
| PATCH | `/tenants/:id` | JWT | ADMIN | Update tenant |
| DELETE | `/tenants/:id` | JWT | ADMIN | Delete tenant |

#### Users
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/users` | JWT | ADMIN, MANAGER | List users |
| GET | `/users/me` | JWT | Any | Get current user profile |
| PATCH | `/users/:id/role` | JWT | ADMIN | Change user role |

#### Digital Twins
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/twins` | JWT | Create digital twin |
| GET | `/twins` | JWT | List twins (with assets & models) |
| GET | `/twins/:id` | JWT | Get twin with full hierarchy |
| PATCH | `/twins/:id` | JWT | Update twin |
| DELETE | `/twins/:id` | JWT | Delete twin |

#### Assets
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/assets` | JWT | Create asset |
| GET | `/assets` | JWT | List assets (filter by twinId) |
| GET | `/assets/:id` | JWT | Get single asset |
| GET | `/assets/roots/:twinId` | JWT | Get root assets of a twin |
| PATCH | `/assets/:id` | JWT | Update asset |
| DELETE | `/assets/:id` | JWT | Delete asset |

#### Sensors
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sensors` | JWT | Create sensor |
| GET | `/sensors` | JWT | List all sensors |
| GET | `/sensors/:id` | JWT | Get sensor by ID |
| GET | `/sensors/by-asset/:assetId` | JWT | Get sensors for an asset |
| PATCH | `/sensors/:id` | JWT | Update sensor |
| DELETE | `/sensors/:id` | JWT | Delete sensor |
| POST | `/sensors/:id/override` | JWT | ADMIN, MANAGER | Set manual override value |
| POST | `/sensors/:id/override/clear` | JWT | ADMIN, MANAGER | Clear override, return to REAL mode |
| POST | `/sensors/:id/stream` | JWT | ADMIN, MANAGER | Start simulated data stream |
| POST | `/sensors/:id/stop` | JWT | ADMIN, MANAGER | Stop data stream |
| GET | `/sensors/streams/active` | JWT | List active stream IDs |
| POST | `/sensors/:id/bind/:modelPartId` | JWT | Bind sensor to 3D model part |
| POST | `/sensors/:id/unbind` | JWT | Unbind sensor from model part |

**Override Request:**
```json
{ "value": 72.5 }
```

> **Note (v0.2.0):** The `mode` field is now deprecated and optional. Override always sets MANUAL mode.

**Stream Request:**
```json
{
  "pattern": "SINE",
  "interval_ms": 1000,
  "min": 10,
  "max": 90
}
```

#### Ingestion
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ingest` | No | Ingest single data point |
| POST | `/ingest/batch` | No | Ingest batch of data points |
| GET | `/ingest/metrics` | JWT (ADMIN, MANAGER) | Get ingestion metrics (totalIngested, totalRejected, totalRateLimited) |

**Single Ingest Response (v0.2.0):**
```json
{ "status": "accepted" }
// or
{ "status": "rejected", "reason": "sensor_in_manual_mode" }
// or
{ "status": "rejected", "reason": "rate_limited" }
```

**Ingestion enforces sensor mode:** If sensor is in `MANUAL` or `STREAM` mode, external ingestion is rejected.

**Rate limiting:** Max 20 ingestions per sensor per second (Redis-backed sliding window).

#### Alerts (new in v0.2.0)
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/alerts` | JWT | Any | List alerts (query: `?limit=N`) |
| GET | `/alerts/unacknowledged` | JWT | Any | List unacknowledged alerts |
| GET | `/alerts/stats` | JWT | Any | Alert statistics (total, unacknowledged, critical, warning) |
| GET | `/alerts/sensor/:sensorId` | JWT | Any | Alerts for a specific sensor |
| POST | `/alerts/:id/acknowledge` | JWT | ADMIN, MANAGER, OPERATOR | Acknowledge alert |
| POST | `/alerts/acknowledge-all` | JWT | ADMIN, MANAGER | Acknowledge all alerts |

#### Health (new in v0.2.0)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Full health check (DB, Redis, TimescaleDB with latency) |
| GET | `/health/live` | No | Liveness probe (always returns OK) |
| GET | `/health/ready` | No | Readiness probe (checks DB connection) |

**Health Response:**
```json
{
  "status": "healthy",
  "uptime": 48.04,
  "timestamp": "2026-04-30T23:42:48.030Z",
  "checks": {
    "database": { "status": "up", "latencyMs": 6 },
    "redis": { "status": "up", "latencyMs": 1 },
    "timescaledb": { "status": "up", "latencyMs": 3 }
  }
}
```

**Single Ingest:**
```json
{ "sensor_id": "sensor-temp-01", "value": 23.5 }
```

**Batch Ingest:**
```json
{
  "data": [
    { "sensor_id": "sensor-temp-01", "value": 23.5 },
    { "sensor_id": "sensor-vibr-01", "value": 4.2 }
  ]
}
```

#### Analytics
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/sensors/:sensorId/history` | JWT | Time-series history (params: from, to, limit) |
| GET | `/analytics/sensors/:sensorId/latest` | JWT | Most recent data point |
| GET | `/analytics/sensors/:sensorId/aggregated` | JWT | Aggregated buckets (params: from, to, interval) |

**Aggregated Response:**
```json
[
  {
    "bucket": "2026-04-30T22:00:00.000Z",
    "sensor_id": "sensor-vibr-01",
    "avg_value": 52.3,
    "min_value": 10.0,
    "max_value": 90.0,
    "count": 60
  }
]
```

#### MQTT Ingestion (non-HTTP)
- Topic: `sensors/{sensorId}/data`
- Payload: `{ "value": 23.5, "metadata": {} }`
- The `MqttIngestionService` subscribes to `sensors/+/data` and routes messages to the ingestion pipeline

### 5.4 Authentication & Authorization

**JWT Authentication:**
- Access tokens expire in 1 day (configurable via `JWT_EXPIRES_IN`)
- Refresh tokens expire in 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- Tokens contain: `sub` (userId), `email`, `role`, `tenantId`
- Refresh tokens are bcrypt-hashed and stored in the user record
- The `JwtAuthGuard` protects all authenticated endpoints

**Google OAuth:**
- Uses `passport-google-oauth20` strategy
- Automatically creates user on first Google login
- Links Google ID to existing email if account exists
- Conditionally loaded — skipped if `GOOGLE_CLIENT_ID` is not configured

**RBAC (Role-Based Access Control):**
- 4 roles: `ADMIN` > `MANAGER` > `OPERATOR` > `VIEWER`
- `@Roles('ADMIN', 'MANAGER')` decorator on controller methods
- `RolesGuard` checks user role against required roles
- `TenantGuard` ensures users can only access their own tenant's data
- **v0.2.0:** Override and stream control endpoints restricted to `ADMIN` and `MANAGER` only (was ADMIN/MANAGER/OPERATOR)

### 5.5 Real-Time System

The real-time pipeline:

```
Sensor Data → TimescaleDB INSERT
           → Redis PUBLISH (channel: sensor:{sensorId}:data)
           → RealtimeService listens to Redis
           → Broadcasts via Socket.IO to subscribed clients
```

**WebSocket Namespace:** `/realtime`

**Client Events (emit):**
| Event | Payload | Description |
|---|---|---|
| `subscribe:tenant` | `{ tenantId }` | Join tenant room |
| `subscribe:twin` | `{ twinId }` | Join twin room |
| `subscribe:sensor` | `{ sensorId }` | Join sensor room |
| `unsubscribe` | `{ room }` | Leave a room |

**Server Events (listen):**
| Event | Payload | Description |
|---|---|---|
| `sensor:data` | `{ sensorId, tenantId, value, timestamp, mode, metadata }` | Real-time sensor reading |
| `alert` | `{ id, severity, message, value, sensorId, tenantId, createdAt }` | Threshold alert (new in v0.2.0) |

**Throttling (v0.2.0):** WebSocket broadcasts are throttled to max 10 updates/second per room. The latest event per room is buffered and flushed every 100ms, shedding intermediate updates under load.

**Deduplication:** Redis subscriptions are created once per unique subscription key, preventing duplicate listeners when multiple clients subscribe to the same tenant/sensor.

**Reconnection:** Subscriptions are tracked in `pendingSubscriptions` and re-emitted on reconnect.

### 5.6 Sensor Streaming Engine

The `SensorStreamService` generates simulated sensor data:

| Pattern | Description |
|---|---|
| `CONSTANT` | Fixed value at `(min + max) / 2` |
| `LINEAR_INCREASE` | Linearly increases from min to max, then wraps |
| `LINEAR_DECREASE` | Linearly decreases from max to min, then wraps |
| `SINE` | Sine wave oscillating between min and max |
| `RANDOM` | Random values between min and max |

Each stream runs on a configurable interval (default 1000ms). On each tick:
1. Generates value based on pattern
2. Writes to TimescaleDB via `TimescaleService.insertSensorData()`
3. Publishes to Redis channel `sensor:{sensorId}:data`
4. The realtime gateway picks up the Redis message and broadcasts via WebSocket

**v0.2.0 changes:**
- Starting a stream sets sensor mode to `STREAM` and clears any manual override
- Stopping a stream reverts mode to `REAL` and sets `streamActive=false`
- Duplicate streams per sensor are prevented (returns existing stream info)
- All intervals are cleaned up on service destroy (`onModuleDestroy`)
- Setting a manual override automatically stops any active stream first

**Single Source of Truth:** Only one data source is active at a time:
- `REAL` mode — accepts external ingestion (HTTP, MQTT)
- `MANUAL` mode — rejects external ingestion, value set via override
- `STREAM` mode — rejects external ingestion, value generated by stream engine

### 5.7 Data Ingestion

Two ingestion paths:

**HTTP Ingestion:**
- `POST /api/v1/ingest` — single data point
- `POST /api/v1/ingest/batch` — batch of data points (parallel processing, chunks of 10)
- Validates sensor existence, checks sensor mode, writes to TimescaleDB, publishes to Redis
- **v0.2.0:** Returns accept/reject status with reason. Rate limited to 20 requests/sec per sensor.
- **v0.2.0:** `GET /ingest/metrics` endpoint exposes totalIngested, totalRejected, totalRateLimited counters

**MQTT Ingestion:**
- Connects to Mosquitto broker at startup
- Subscribes to `sensors/+/data` wildcard topic
- Parses JSON payload, extracts sensorId from topic
- Routes through the same ingestion pipeline as HTTP

### 5.8 Analytics

Three query types powered by TimescaleDB:

| Query | SQL Feature | Description |
|---|---|---|
| **History** | `ORDER BY time DESC LIMIT N` | Raw time-series data for a sensor |
| **Latest** | `ORDER BY time DESC LIMIT 1` | Most recent reading |
| **Aggregated** | `time_bucket()` | Averaged/min/max/count per time bucket |

Analytics responses are cached in Redis with configurable TTL.

### 5.9 Alert System

**New in v0.2.0.** The alert system monitors sensor data against configurable thresholds.

**How it works:**
1. Each sensor can have `alertMinThreshold` and `alertMaxThreshold` fields (nullable)
2. On every data ingestion (including stream ticks), the value is checked against thresholds
3. If value exceeds max or falls below min, a `WARNING` alert is created in the database
4. The alert is published to Redis channel `alert:{tenantId}`
5. `RealtimeService` picks up the Redis message and broadcasts via WebSocket `alert` event
6. Frontend toast notification and AlertsPage update in real-time

**Alert acknowledgment:** Alerts can be acknowledged individually or in bulk. Only `ADMIN` and `MANAGER` can acknowledge all.

### 5.10 Health & Observability

**New in v0.2.0.** Three health endpoints for Kubernetes/Docker health probes:

| Endpoint | Purpose | Checks |
|---|---|---|
| `GET /health` | Full system health | Database, Redis, TimescaleDB (with latency) |
| `GET /health/live` | Liveness probe | Always returns `{ status: "ok" }` |
| `GET /health/ready` | Readiness probe | Database connectivity |

These endpoints are **unauthenticated** for use by container orchestrators.

---

## 6. Frontend (React)

### 6.1 Pages

| Route | Page | Description |
|---|---|---|
| `/login` | `LoginPage` | Email/password login form + Google OAuth button. Pre-filled with demo credentials |
| `/` | `DashboardPage` | KPI cards (twins, sensors, active streams, alerts), area chart, live sensor values, alert panel |
| `/twins` | `TwinsPage` | Twin list with create form, asset hierarchy tree with type icons |
| `/viewer` | `ViewerPage` | Interactive 3D factory model. Click mesh → sensor binding panel appears |
| `/sensors` | `SensorsPage` | Grid of sensor cards with live values, mode badges, stream status |
| `/sensor-testing` | `SensorTestingPage` | **Core feature** — left: sensor tree, right: full control panel |
| `/alerts` | `AlertsPage` | Alert list with filter (all/unacknowledged), acknowledge, stats **(v0.2.0)** |

All pages except `/login` are **protected** — unauthenticated users are redirected to login.
Pages are **lazy-loaded** via `React.lazy()` for performance.

### 6.2 Components

#### UI Components (`components/ui/`)
- **Button** — Variants: primary, secondary, destructive, outline, ghost. Sizes: sm, md, lg
- **Card** — Card container with CardHeader, CardTitle, CardContent sub-components
- **Input** — Styled text/number input with focus ring
- **Badge** — Status badges: default (blue), success (green), warning (yellow), danger (red)
- **ErrorBoundary** — React error boundary with retry button and error message **(v0.2.0)**
- **Toast** — Global toast notification system with success/error/warning/info types, auto-dismiss **(v0.2.0)**
- **ConnectionStatus** — WebSocket connection status indicator (connected/connecting/reconnecting/disconnected) **(v0.2.0)**

#### Layout (`components/layout/`)
- **AppLayout** — Protected wrapper with sidebar + header (ConnectionStatus) + ErrorBoundary-wrapped content outlet **(updated v0.2.0)**
- **Sidebar** — Navigation with Lucide icons: Dashboard, Digital Twins, 3D Viewer, Sensors, Testing Panel, Alerts, Logout **(updated v0.2.0)**

#### 3D Components (`components/3d/`)
- **SceneViewer** — Three.js canvas with ambient/directional/point lighting, orbit controls, environment map, contact shadows
- **DemoFactory** — Interactive 3D factory floor with:
  - **Motor unit** — clickable, bound to temperature sensor
  - **Conveyor belt** — clickable, bound to vibration sensor
  - **Hydraulic press** — clickable, bound to pressure sensor
  - **Robotic arm** — clickable, bound to RPM sensor
  - **Control panel** — decorative element with green screen
  - **Color coding:** green (normal, <60), yellow (warning, 60-80), red (critical, >80)
  - **Selection highlight:** purple glow when clicked

#### Sensor Components (`components/sensors/`)
- **SensorBindingPanel** — Appears when a mesh is selected in the 3D viewer. Shows bound sensors with live values. Form to attach new sensor (name, type dropdown, unit input)

### 6.3 State Management

Four **Zustand** stores:

#### `authStore`
| Field | Type | Description |
|---|---|---|
| `user` | `User \| null` | Current authenticated user |
| `isAuthenticated` | `boolean` | Auth status |
| `isLoading` | `boolean` | Loading state |
| `login()` | function | Login with email/password, store tokens |
| `register()` | function | Register new user |
| `logout()` | function | Clear tokens, reset state |

#### `twinStore`
| Field | Type | Description |
|---|---|---|
| `twins` | `DigitalTwin[]` | All twins |
| `currentTwin` | `DigitalTwin \| null` | Selected twin |
| `assets` | `Asset[]` | Assets of current twin |
| `fetchTwins()` | function | Load all twins from API |
| `selectTwin()` | function | Select twin + load assets |
| `createTwin()` | function | Create new twin |

#### `sensorStore`
| Field | Type | Description |
|---|---|---|
| `sensors` | `Sensor[]` | All sensors |
| `selectedSensor` | `Sensor \| null` | Currently selected sensor |
| `realtimeValues` | `Map<string, SensorDataPoint>` | Live values by sensor ID |
| `overrideSensor()` | function | Set manual override |
| `clearOverride()` | function | Return to REAL mode |
| `startStream()` | function | Start simulated data stream |
| `stopStream()` | function | Stop stream |
| `initWebSocket()` | function | Connect WebSocket + subscribe to all sensor events |

#### `viewerStore`
| Field | Type | Description |
|---|---|---|
| `selectedMeshName` | `string \| null` | Name of clicked mesh |
| `selectedMeshId` | `string \| null` | Associated ID |
| `hoveredMeshName` | `string \| null` | Currently hovered mesh |
| `selectMesh()` | function | Set selected mesh |
| `clearSelection()` | function | Deselect |

### 6.4 Services

#### API Service (`services/api.ts`)
- Axios instance with base URL `/api/v1`
- Request interceptor: attaches `Authorization: Bearer <token>` header
- Response interceptor: on 401, clears tokens and redirects to `/login`
- Organized into namespaces: `authApi`, `twinsApi`, `assetsApi`, `sensorsApi`, `ingestApi`, `analyticsApi`, `alertsApi`, `healthApi`
- **v0.2.0:** Automatic retry on 5xx errors for GET requests (1 retry, 1s delay)

#### WebSocket Service (`services/websocket.ts`)
- Socket.IO client connecting to `/realtime` namespace
- Methods: `connect()`, `disconnect()`, `subscribeTenant()`, `subscribeSensor()`, `subscribeTwin()`
- Listener system: `onSensorData(sensorId, callback)` — returns unsubscribe function
- `onAllSensorData(callback)` — wildcard listener for all sensor events
- **v0.2.0 additions:**
  - `onAlert(callback)` — listen for alert events
  - `onStatusChange(callback)` — track connection status changes
  - Auto-reconnect with exponential backoff (1s–10s)
  - Pending subscriptions replayed on reconnect
  - Connection status tracking: `connected`, `connecting`, `reconnecting`, `disconnected`

---

## 7. Infrastructure & DevOps

### 7.1 Docker Compose Services

| Service | Image | Port (host:container) | Purpose |
|---|---|---|---|
| `app` | Built from Dockerfile | 3000:3000 | NestJS backend |
| `postgres` | timescale/timescaledb:latest-pg16 | 5433:5432 | PostgreSQL + TimescaleDB |
| `redis` | redis:7-alpine | 6379:6379 | Caching + pub/sub |
| `kafka` | apache/kafka:3.7.0 | 9092:9092 | Event streaming (KRaft mode, no Zookeeper) |
| `mosquitto` | eclipse-mosquitto:2 | 1884:1883, 9002:9001 | MQTT broker |
| `nginx` | nginx:alpine | 80:80 | API gateway / reverse proxy |

**Volumes:** pgdata, redisdata, mosquittodata, mosquittolog, uploads

**Network:** `nebula-net` (bridge)

**Health checks:**
- PostgreSQL: `pg_isready -U nebulaTwin -d nebula_twin`
- Redis: `redis-cli -a nebulaTwin ping`

### 7.2 Dockerfile

Multi-stage build:
1. **Builder stage** — `node:20-alpine`, installs deps, generates Prisma client, builds NestJS
2. **Production stage** — `node:20-alpine`, copies dist + node_modules + prisma, runs as non-root user `nestjs:nodejs`

Health check: `wget --spider http://localhost:3000/api/v1/health`

### 7.3 NGINX API Gateway

Configuration features:
- Rate limiting: 10 req/s per IP (burst 20)
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- Proxy: `/api/` → backend:3000, `/docs` → backend:3000
- WebSocket: `/realtime` → backend:3000 (with upgrade headers)
- Health check: `/health` returns 200

---

## 8. Environment Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3000 | Backend server port |
| `API_PREFIX` | api/v1 | API route prefix |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | localhost | Redis hostname |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | — | Redis password |
| `KAFKA_BROKERS` | localhost:9092 | Kafka broker addresses |
| `KAFKA_CLIENT_ID` | nebula-twin | Kafka client identifier |
| `KAFKA_GROUP_ID` | nebula-twin-group | Kafka consumer group |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_EXPIRES_IN` | 1d | Access token expiry |
| `JWT_REFRESH_SECRET` | — | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh token expiry |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret (optional) |
| `GOOGLE_CALLBACK_URL` | http://localhost:3000/api/v1/auth/google/callback | OAuth callback URL |
| `MQTT_URL` | mqtt://localhost:1883 | MQTT broker URL |
| `MQTT_USERNAME` | — | MQTT username |
| `MQTT_PASSWORD` | — | MQTT password |
| `UPLOAD_DIR` | ./uploads | File upload directory |
| `MAX_FILE_SIZE` | 104857600 | Max upload size (100MB) |
| `THROTTLE_TTL` | 60 | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | 100 | Max requests per window |
| `CORS_ORIGINS` | http://localhost:3000,http://localhost:4200 | Allowed CORS origins |

---

## 9. Setup & Running

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL client (`psql`) — optional, for manual DB access

### Step-by-Step

```bash
# 1. Clone and enter project
cd nebula

# 2. Copy environment file
cp .env.example .env
# Edit .env with your credentials

# 3. Install backend dependencies
npm install

# 4. Start infrastructure containers
docker-compose up -d postgres redis kafka mosquitto

# 5. Wait for PostgreSQL to be healthy, then run migrations
npx prisma migrate dev --name init

# 6. Create the TimescaleDB hypertable (if not auto-created)
PGPASSWORD=<your_password> psql -h localhost -p 5433 -U <your_user> -d nebula_twin \
  -f prisma/migrations/00000000000000_init_timescaledb/migration.sql

# 7. Seed demo data
npx ts-node prisma/seed.ts

# 8. Start backend (dev mode with hot-reload)
npm run start:dev

# 9. Install frontend dependencies
cd frontend
npm install

# 10. Start frontend (dev mode with HMR)
npx vite --host

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
# Swagger:  http://localhost:3000/docs
```

### NPM Scripts (Backend)

| Script | Command | Description |
|---|---|---|
| `start:dev` | `nest start --watch` | Development with hot-reload |
| `start:prod` | `node dist/main` | Production mode |
| `build` | `nest build` | Compile TypeScript |
| `prisma:migrate` | `prisma migrate dev` | Run database migrations |
| `prisma:seed` | `ts-node prisma/seed.ts` | Seed database |
| `docker:up` | `docker-compose up -d` | Start all containers |
| `docker:down` | `docker-compose down` | Stop all containers |
| `test` | `jest` | Run unit tests |
| `lint` | `eslint --fix` | Lint and auto-fix |

---

## 10. Seeded Demo Data

The seed script (`prisma/seed.ts`) creates:

| Entity | Details |
|---|---|
| **Tenant** | "NebulaTwin Demo Org" (`default-tenant-id`) |
| **Admin User** | `admin@nebulatwin.io` / `admin123` (role: ADMIN) |
| **Digital Twin** | "Smart Factory Alpha" (`demo-twin-id`) |
| **Assets** (hierarchical) | Factory → Production Line A → CNC Machine 01 → Spindle Motor |
| **Sensors** (4) | Temperature (°C), Vibration (mm/s), Pressure (bar), RPM (rpm) |

### Asset Hierarchy
```
Smart Factory Alpha
└── Main Factory Building (FACTORY)
    └── Production Line A (LINE)
        └── CNC Machine 01 (MACHINE)
            └── Spindle Motor (COMPONENT)
                ├── Temperature Sensor (°C)
                ├── Vibration Sensor (mm/s)
                ├── Pressure Sensor (bar)
                └── RPM Sensor (rpm)
```

### Default Login
- **Email:** `admin@nebulatwin.io`
- **Password:** `admin123`

---

## 11. Data Flow Diagrams

### Sensor Override Flow
```
User clicks "Apply" in Testing Panel
  → POST /api/v1/sensors/:id/override { mode: "manual", value: 72.5 }
  → SensorsService.setOverride()
    → Prisma UPDATE sensor (mode=MANUAL, manualValue=72.5)
    → TimescaleService.insertSensorData(sensorId, 72.5)
    → RedisService.publish("sensor:{id}:data", payload)
  → RealtimeService picks up Redis message
  → Socket.IO broadcasts "sensor:data" to subscribed clients
  → Frontend Zustand store updates realtimeValues Map
  → React re-renders:
    → 3D model mesh color changes (green/yellow/red)
    → Chart updates with new data point
    → Testing panel shows updated value
```

### Sensor Stream Flow
```
User clicks "Start Stream" (pattern: SINE, interval: 1000ms, min: 10, max: 90)
  → POST /api/v1/sensors/:id/stream
  → SensorStreamService.startStream()
    → Creates setInterval(1000ms)
    → Every tick:
      → Calculate value based on SINE pattern
      → TimescaleService.insertSensorData()
      → RedisService.publish()
      → Socket.IO broadcasts to clients
  → User clicks "Stop Stream"
    → POST /api/v1/sensors/:id/stop
    → clearInterval(), update DB (streamActive=false)
```

### MQTT Ingestion Flow
```
IoT Device publishes to: sensors/sensor-temp-01/data
  → Mosquitto broker receives message
  → MqttIngestionService.handleMessage()
    → Parse topic → extract sensorId
    → Parse JSON payload → extract value
    → IngestionService.ingestSingle()
      → TimescaleService.insertSensorData()
      → RedisService.publish()
      → Socket.IO broadcasts to clients
```

---

## 12. Security

| Feature | Implementation |
|---|---|
| **Authentication** | JWT (access + refresh tokens), Google OAuth 2.0 |
| **Password hashing** | bcrypt (10 salt rounds) |
| **RBAC** | 4 roles with guard-based enforcement |
| **Tenant isolation** | TenantGuard ensures cross-tenant data access is blocked |
| **HTTP security headers** | Helmet.js (X-Frame-Options, CSP, HSTS, etc.) |
| **Rate limiting** | NestJS Throttler (100 req/60s default) + NGINX (10 req/s) |
| **Input validation** | class-validator with whitelist + forbidNonWhitelisted |
| **CORS** | Configurable allowed origins |
| **Non-root container** | Docker runs as `nestjs` user (UID 1001) |
| **Token storage** | localStorage (frontend) — for production, use httpOnly cookies |

---

## 13. Production Hardening (v0.2.0)

The following hardening changes were made in v0.2.0:

### Backend

| Area | Change |
|---|---|
| **Sensor Modes** | Added `STREAM` mode. Sensors now have 3 exclusive modes: `REAL`, `MANUAL`, `STREAM` |
| **Single Source of Truth** | Only one data source active at a time. Override stops streams; streams clear overrides |
| **Ingestion Gating** | External ingestion rejected when sensor is in `MANUAL` or `STREAM` mode |
| **Rate Limiting** | Per-sensor rate limit (20/sec) via Redis sliding window |
| **Ingestion Metrics** | `GET /ingest/metrics` endpoint for monitoring |
| **Alert System** | Configurable min/max thresholds per sensor. Alerts created on breach, broadcast via WebSocket |
| **Health Endpoints** | `/health`, `/health/live`, `/health/ready` for container orchestration |
| **WebSocket Throttling** | 100ms flush interval with load shedding (latest-wins per room) |
| **Redis psubscribe** | Pattern-based subscriptions for sensor data and alert channels |
| **Dedup Subscriptions** | Redis subscriptions created once per unique key, not per client |
| **RBAC Tightened** | Override/stream endpoints restricted to ADMIN + MANAGER only |
| **Override DTO** | `mode` field deprecated and optional |
| **Duplicate Prevention** | `ON CONFLICT DO NOTHING` on TimescaleDB inserts |
| **Error Handling** | Try/catch with structured logging on TimescaleDB writes |
| **Stream Cleanup** | `onModuleDestroy` clears all intervals. Duplicate streams prevented |
| **tsconfig** | Excluded `frontend/` from backend TypeScript compilation |

### Frontend

| Area | Change |
|---|---|
| **ErrorBoundary** | Wraps all routes — catches and displays errors with retry |
| **Toast System** | Global toast notifications for actions (success, error, warning, info) |
| **ConnectionStatus** | Header indicator showing WebSocket connection state |
| **Auto-Reconnect** | WebSocket reconnects with exponential backoff, replays subscriptions |
| **API Retry** | Auto-retries GET requests on 5xx errors (1 retry, 1s delay) |
| **Alerts Page** | Full alerts dashboard with filter, acknowledge, stats |
| **Sidebar** | Added Alerts navigation link |
| **Types** | Added `STREAM` mode, `AlertEvent`, `Alert`, `AlertSeverity` |
| **Sensor Store** | Toast notifications on all actions, error handling |

### Tests

| Suite | Tests | Coverage |
|---|---|---|
| `sensors.service.spec.ts` | 8 | Mode enforcement, override flow, alert thresholds |
| `ingestion.service.spec.ts` | 6 | Validation, rate limiting, metrics, batch processing |
| `alerts.service.spec.ts` | 5 | CRUD, acknowledgment, stats |
| **Total** | **19** | All passing |

---

## 14. Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific suite
npx jest --testPathPattern="sensors.service.spec"

# Run with coverage
npm run test:cov
```

### Test Architecture

All tests use **NestJS Testing Module** with mocked dependencies:
- `PrismaService` — mocked with `jest.fn()` per method
- `TimescaleService` — mocked for insert operations
- `EventBusService` — mocked for publish operations
- `RedisService` — mocked for rate limiting

### Key Test Scenarios

**Sensor Mode Enforcement:**
- REAL mode accepts ingestion ✓
- MANUAL mode rejects ingestion ✓
- STREAM mode rejects ingestion ✓
- Missing sensor returns not_found ✓

**Override Flow:**
- Override stops active stream ✓
- Override without active stream skips stop ✓

**Alert Thresholds:**
- Value above max creates WARNING alert ✓
- Value within thresholds creates no alert ✓

**Ingestion:**
- Valid payload accepted ✓
- Invalid sensor_id rejected ✓
- NaN value rejected ✓
- Rate limit triggers at threshold ✓
- Batch with mixed results ✓

---

## 15. Troubleshooting

### Port conflicts
```bash
# Check what's using a port
lsof -i :3000
lsof -i :5432

# Kill process on port
kill $(lsof -t -i:3000)
```

### `sensor_data` table missing
If Prisma migrate resets the schema, the TimescaleDB hypertable may be dropped:
```bash
PGPASSWORD=<password> psql -h localhost -p 5433 -U <user> -d nebula_twin \
  -f prisma/migrations/00000000000000_init_timescaledb/migration.sql
```

### Kafka image not found
Use `apache/kafka:3.7.0` instead of `bitnami/kafka` (Bitnami tags are unpredictable).

### Google OAuth crash on startup
If `GOOGLE_CLIENT_ID` is not a valid OAuth client ID, the Google strategy is automatically skipped. Set real credentials or leave as placeholder — the app boots either way.

### JSONB cast error on sensor data insert
The TimescaleDB metadata column is `JSONB`. Ensure the INSERT uses `$3::jsonb` cast.

### Backend hot-reload not working
NestJS `--watch` mode may hold the old process. Kill and restart:
```bash
kill $(lsof -t -i:3000); npm run start:dev
```

---

*NebulaTwin Pro — Built with NestJS, React, Three.js, TimescaleDB, Redis, Kafka, and MQTT.*
