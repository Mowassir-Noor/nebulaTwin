// ─── Auth ────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  tenantId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Tenant ──────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

// ─── Digital Twin ────────────────────────────────────────
export interface DigitalTwin {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  assets?: Asset[];
  models?: Model3D[];
  createdAt: string;
  updatedAt: string;
}

// ─── Asset ───────────────────────────────────────────────
export type AssetType = 'FACTORY' | 'LINE' | 'MACHINE' | 'COMPONENT';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  parentId?: string;
  twinId: string;
  tenantId: string;
  children?: Asset[];
  sensors?: Sensor[];
}

// ─── 3D Model ────────────────────────────────────────────
export interface Model3D {
  id: string;
  name: string;
  fileUrl: string;
  format: string;
  twinId: string;
  parts?: ModelPart[];
}

export interface ModelPart {
  id: string;
  name: string;
  meshName: string;
  modelId: string;
  sensors?: Sensor[];
}

// ─── Sensor ──────────────────────────────────────────────
export type SensorMode = 'REAL' | 'MANUAL' | 'STREAM';
export type StreamPattern = 'CONSTANT' | 'LINEAR_INCREASE' | 'LINEAR_DECREASE' | 'SINE' | 'RANDOM';

export interface Sensor {
  id: string;
  name: string;
  type: string;
  unit: string;
  mode: SensorMode;
  manualValue?: number;
  streamActive?: boolean;
  streamPattern?: StreamPattern;
  streamInterval?: number;
  streamMin?: number;
  streamMax?: number;
  alertMinThreshold?: number | null;
  alertMaxThreshold?: number | null;
  assetId?: string;
  modelPartId?: string;
  tenantId: string;
  asset?: Asset;
  modelPart?: ModelPart;
}

// ─── Sensor Data (realtime) ──────────────────────────────
export interface SensorDataPoint {
  sensorId: string;
  tenantId: string;
  value: number;
  timestamp: string;
  mode: string;
  metadata?: Record<string, unknown>;
}

// ─── Analytics ───────────────────────────────────────────
export interface TimeSeriesPoint {
  time: string;
  value: number;
}

export interface AggregatedPoint {
  bucket: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  count: number;
}

// ─── Alerts ─────────────────────────────────────────────
export type AlertSeverity = 'WARNING' | 'CRITICAL';

export interface AlertEvent {
  id: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  sensorId: string;
  tenantId: string;
  createdAt: string;
}

export interface Alert extends AlertEvent {
  acknowledged: boolean;
  sensor?: { id: string; name: string; type: string; unit: string };
}

// ─── Stream Config ───────────────────────────────────────
export interface StartStreamConfig {
  pattern: StreamPattern;
  interval_ms: number;
  min: number;
  max: number;
}
