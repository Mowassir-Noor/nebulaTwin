import axios from 'axios';
import type {
  AuthTokens,
  DigitalTwin,
  Asset,
  Sensor,
  Alert,
  StartStreamConfig,
  TimeSeriesPoint,
  AggregatedPoint,
} from '@/types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Interceptor: attach JWT ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retry logic for transient failures
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    if (
      err.response?.status >= 500 &&
      !config._retry &&
      config.method === 'get'
    ) {
      config._retry = true;
      await new Promise((r) => setTimeout(r, 1000));
      return api(config);
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── Auth ────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    api.post<AuthTokens>('/auth/register', data),
  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// ─── Twins ───────────────────────────────────────────────
export const twinsApi = {
  list: () => api.get<DigitalTwin[]>('/twins'),
  get: (id: string) => api.get<DigitalTwin>(`/twins/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<DigitalTwin>('/twins', data),
  update: (id: string, data: Partial<DigitalTwin>) =>
    api.patch<DigitalTwin>(`/twins/${id}`, data),
  delete: (id: string) => api.delete(`/twins/${id}`),
};

// ─── Assets ──────────────────────────────────────────────
export const assetsApi = {
  list: (twinId: string) => api.get<Asset[]>(`/assets?twinId=${twinId}`),
  get: (id: string) => api.get<Asset>(`/assets/${id}`),
  roots: (twinId: string) => api.get<Asset[]>(`/assets/roots/${twinId}`),
  create: (data: { name: string; type: string; twinId: string; parentId?: string }) =>
    api.post<Asset>('/assets', data),
  update: (id: string, data: Partial<Asset>) =>
    api.patch<Asset>(`/assets/${id}`, data),
  delete: (id: string) => api.delete(`/assets/${id}`),
};

// ─── Sensors ─────────────────────────────────────────────
export const sensorsApi = {
  list: () => api.get<Sensor[]>('/sensors'),
  get: (id: string) => api.get<Sensor>(`/sensors/${id}`),
  byAsset: (assetId: string) => api.get<Sensor[]>(`/sensors/by-asset/${assetId}`),
  create: (data: { name: string; type: string; unit: string; assetId?: string }) =>
    api.post<Sensor>('/sensors', data),
  update: (id: string, data: Partial<Sensor>) =>
    api.patch<Sensor>(`/sensors/${id}`, data),
  delete: (id: string) => api.delete(`/sensors/${id}`),

  // Override
  override: (id: string, value: number) =>
    api.post(`/sensors/${id}/override`, { mode: 'manual', value }),
  clearOverride: (id: string) =>
    api.post(`/sensors/${id}/override/clear`),

  // Stream
  startStream: (id: string, config: StartStreamConfig) =>
    api.post(`/sensors/${id}/stream`, config),
  stopStream: (id: string) =>
    api.post(`/sensors/${id}/stop`),
  activeStreams: () =>
    api.get<{ activeStreams: string[] }>('/sensors/streams/active'),

  // Binding
  bind: (sensorId: string, modelPartId: string) =>
    api.post(`/sensors/${sensorId}/bind/${modelPartId}`),
  unbind: (sensorId: string) =>
    api.post(`/sensors/${sensorId}/unbind`),
};

// ─── Ingestion ───────────────────────────────────────────
export const ingestApi = {
  single: (sensorId: string, value: number) =>
    api.post('/ingest', { sensor_id: sensorId, value }),
  batch: (data: { sensor_id: string; value: number }[]) =>
    api.post('/ingest/batch', { data }),
};

// ─── Analytics ───────────────────────────────────────────
export const analyticsApi = {
  history: (sensorId: string, from: string, to: string, limit?: number) =>
    api.get<TimeSeriesPoint[]>(`/analytics/sensors/${sensorId}/history`, {
      params: { from, to, limit },
    }),
  latest: (sensorId: string) =>
    api.get<TimeSeriesPoint>(`/analytics/sensors/${sensorId}/latest`),
  aggregated: (sensorId: string, from: string, to: string, interval?: string) =>
    api.get<AggregatedPoint[]>(`/analytics/sensors/${sensorId}/aggregated`, {
      params: { from, to, interval },
    }),
};

// ─── Alerts ─────────────────────────────────────────────
export const alertsApi = {
  list: (limit?: number) =>
    api.get<Alert[]>('/alerts', { params: { limit } }),
  unacknowledged: () =>
    api.get<Alert[]>('/alerts/unacknowledged'),
  stats: () =>
    api.get<{ total: number; unacknowledged: number; critical: number; warning: number }>('/alerts/stats'),
  bySensor: (sensorId: string) =>
    api.get<Alert[]>(`/alerts/sensor/${sensorId}`),
  acknowledge: (id: string) =>
    api.post(`/alerts/${id}/acknowledge`),
  acknowledgeAll: () =>
    api.post('/alerts/acknowledge-all'),
};

// ─── Health ─────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
