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
export type ModelFormat = 'GLTF' | 'GLB' | 'OBJ' | 'FBX';

export interface Model3D {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  format: ModelFormat;
  sizeBytes?: number;
  meshStructure?: string[];
  twinId: string;
  tenantId: string;
  twin?: { id: string; name: string };
  parts?: ModelPart[];
  modelParts?: ModelPart[];
  // Versioning (v0.4.0)
  version: number;
  isLatest: boolean;
  parentModelId?: string;
  parentModel?: { id: string; version: number; name: string };
  childVersions?: { id: string; version: number; createdAt: string; isLatest: boolean }[];
  // Soft delete (v0.4.0)
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersion {
  id: string;
  version: number;
  name: string;
  isLatest: boolean;
  createdAt: string;
  fileUrl: string;
  sizeBytes?: number;
}

export interface ModelPart {
  id: string;
  name: string;
  modelId: string;
  metadata?: Record<string, unknown>;
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
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

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

// ─── Collaboration (v0.4.0) ─────────────────────────────
export interface CollaborationUser {
  userId: string;
  userName: string;
  joinedAt: number;
}

export interface CollaborationSelection {
  userId: string;
  userName: string;
  meshName: string | null;
  modelPartId: string | null;
}

// ─── Anomaly (v0.4.0) ──────────────────────────────────
export interface AnomalyResult {
  sensorId: string;
  anomalyScore: number;
  isAnomaly: boolean;
  reason: string;
  currentValue: number;
  mean: number;
  stdDev: number;
  zScore: number;
}
