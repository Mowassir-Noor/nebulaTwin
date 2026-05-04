# NebulaTwin — Frontend

React + TypeScript + Vite frontend for the **NebulaTwin Pro** industrial digital twin platform.

## Tech Stack

| Category | Libraries |
|----------|-----------|
| Framework | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, `tw-animate-css` |
| Animations | Framer Motion |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei` |
| State | Zustand |
| Data fetching | TanStack Query, Axios |
| Charts | Recharts |
| Realtime | Socket.IO Client |
| Icons | Lucide React |

## Development Setup

```bash
# From the frontend/ directory
npm install
npm run dev        # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:3000` (backend). Make sure the backend is running first.

```bash
npm run build      # Production build (tsc -b && vite build)
npm run preview    # Preview production build locally
npm run lint       # ESLint
```

## Folder Structure

```
src/
├── App.tsx                    # Router — Marketing (public) vs /control (dashboard)
├── main.tsx
├── index.css                  # Global Tailwind theme tokens + utilities
│
├── pages/
│   ├── marketing/             # Landing, Features, About, Contact, Pricing
│   ├── auth/                  # LoginPage
│   ├── dashboard/             # DashboardPage
│   ├── twins/                 # TwinsPage
│   ├── models/                # ModelsPage
│   ├── alerts/                # AlertsPage
│   ├── sensors/               # SensorsPage, SensorTestingPage
│   └── viewer/
│       ├── ViewerPage.tsx     # Orchestrator: twin/model state, playback mode, layout
│       └── components/
│           ├── TopBar.tsx             # Fixed top bar
│           ├── LeftPanel.tsx          # Collapsible/resizable left panel
│           ├── RightPanel.tsx         # Context right panel
│           ├── BottomDock.tsx         # Collapsible bottom dock
│           ├── AlertsPanel.tsx        # Alerts list (reused in dock)
│           ├── AssetTreePanel.tsx     # Legacy asset tree
│           ├── ControlSidebar.tsx     # Legacy control sidebar
│           ├── KPIView.tsx            # KPI metrics
│           └── SensorControlsPanel.tsx
│
├── components/
│   ├── ui/                    # Button, Card, Input, Badge, ErrorBoundary, Toast, ConnectionStatus, Skeleton
│   ├── layout/                # AppLayout, MarketingLayout, Sidebar
│   ├── 3d/
│   │   ├── SceneViewer.tsx            # Canvas + scene setup + FPS badge
│   │   ├── DemoFactory.tsx            # Demo factory meshes (playback-aware)
│   │   ├── UploadedModel.tsx          # GLTF model loader (playback-aware)
│   │   └── SensorDragOverlay.tsx      # Drag-to-bind overlay + success animation
│   ├── playback/              # PlaybackControls
│   ├── sensors/               # SensorBindingPanel
│   ├── collaboration/         # PresenceIndicator
│   └── models/                # VersionSelector
│
├── store/
│   ├── authStore.ts           # User session, JWT
│   ├── twinStore.ts           # Digital twins + assets
│   ├── sensorStore.ts         # Sensors, realtime values, override/stream actions
│   └── viewerStore.ts         # Selected/hovered mesh, active model, focus
│
├── services/
│   ├── api.ts                 # Axios client (JWT inject, 5xx retry)
│   └── websocket.ts           # Socket.IO singleton (auto-reconnect, sensor/alert subscriptions)
│
├── utils/
│   ├── cn.ts                  # clsx + tailwind-merge
│   ├── rbac.ts                # useRole RBAC hook
│   └── sensorVisualization.ts # Gradient color, emissive, status, format helpers
│
└── types/
    └── index.ts               # All shared TypeScript interfaces
```

## Viewer Architecture (`/viewer`)

The `/viewer` page is a multi-panel industrial dashboard. `ViewerPage.tsx` owns all top-level state and passes props down to the four layout panels.

```
ViewerPage
├── TopBar          — twin/model select, mode badge, controls
├── LeftPanel       — asset tree OR sensor list (collapsible, resizable)
├── main
│   ├── StatusCards  — Sensors, Critical count, Mode (overlaid)
│   ├── SceneViewer  — Three.js Canvas (3D meshes, lighting, drag-drop)
│   └── BottomDock   — charts, alerts, logs, playback controls
└── RightPanel      — context panel for selected mesh/sensor
```

### Data flow

- **LIVE mode** — `sensorStore.realtimeValues` (WebSocket) drives 3D colors, right panel chart, bottom charts, status cards.
- **PLAYBACK mode** — activated when `PlaybackControls` fires `onPlaybackTick`. `playbackValues: Map<string, number>` flows from `ViewerPage` down to `SceneViewer`, `BottomDock`, and status cards. WebSocket values are ignored until `onPlaybackEnd`.

### 3D interaction rules

| Action | Effect |
|--------|--------|
| Click mesh | `viewerStore.selectMesh(name, sensorId, modelPartId)` → opens `RightPanel` |
| Hover mesh | `viewerStore.hoverMesh(name, modelPartId)` → blue emissive + tooltip |
| Drag sensor → mesh | `SensorDragOverlay` raycasts → `sensorsApi.bind(sensorId, modelPartId)` |
| Playback tick | `playbackValues` injected into `UploadedModel` / `DemoFactory` |

### Sensor binding invariant

**Never** call `sensorsApi.bind()` anywhere except `SensorDragOverlay.tsx`. Always use `modelPartId` (UUID) as the binding key, never mesh name.

## Sensor Visualization (`utils/sensorVisualization.ts`)

All color/status logic is centralised here. Import from this file — do not inline threshold checks elsewhere.

```ts
import {
  getSensorGradientColor,   // '#22c55e' → '#eab308' → '#ef4444'
  getSensorEmissiveIntensity, // 0.08 – 0.50 for Three.js emissive
  getSensorStatus,           // 'offline' | 'normal' | 'warning' | 'critical'
  getSensorStatusClasses,    // Tailwind class string
  formatSensorValue,         // '72.3 °C'
  normalizeSensorValue,      // 0.0 – 1.0 against alertMinThreshold/alertMaxThreshold
  getSensorValue,            // resolves override → realtime → manualValue
} from '@/utils/sensorVisualization';
```

Color thresholds use the sensor's `alertMinThreshold` / `alertMaxThreshold` fields. If unset, defaults are `0` and `100`.

## State Management

Three Zustand stores are used in the viewer:

| Store | Key state | Key actions |
|-------|-----------|-------------|
| `viewerStore` | `selectedMeshName`, `selectedModelPartId`, `hoveredMeshName`, `activeModelId` | `selectMesh`, `hoverMesh`, `clearSelection`, `focusOnModelPart`, `setActiveModel` |
| `sensorStore` | `sensors[]`, `realtimeValues`, `selectedSensor` | `fetchSensors`, `selectSensor`, `overrideSensor`, `clearOverride`, `startStream`, `stopStream`, `initWebSocket` |
| `twinStore` | `twins[]`, `assets[]` | `fetchTwins`, `selectTwin`, `fetchAssets` |

**Rule:** Do not add new state to these stores. If the viewer needs additional local UI state, keep it in component `useState`.

## Design System

Dark industrial theme, defined in `src/index.css` via CSS custom properties.

| Token | Value |
|-------|-------|
| Background | `oklch(0.145 0.025 265)` ≈ `#090d1a` |
| Card | `oklch(0.19 0.028 265)` ≈ `#111827` |
| Border | `oklch(0.3 0.025 265 / 60%)` ≈ `slate-800` |
| Accent (cyan) | `oklch(0.82 0.15 200)` ≈ `#22d3ee` |
| Primary (nebula) | `oklch(0.65 0.22 285)` ≈ `#8b5cf6` |

**Conventions:**
- Rounded corners: `rounded-2xl` for cards/panels, `rounded-xl` for inputs/buttons
- Panel backgrounds: `bg-slate-950/88 backdrop-blur-xl`
- Borders: `border-slate-800` or `border-slate-700`
- Accent highlights: `text-cyan-300`, `border-cyan-400/30`, `bg-cyan-400/10`
- Use `cn()` from `@/utils/cn` for all conditional class composition

## Environment Variables

The frontend reads no `.env` variables directly — all config is handled by the Vite proxy (`vite.config.ts`). The backend URL is always `http://localhost:3000` in development.
