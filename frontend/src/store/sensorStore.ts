import { create } from 'zustand';
import type { Sensor, SensorDataPoint, StartStreamConfig } from '@/types';
import { sensorsApi } from '@/services/api';
import wsService from '@/services/websocket';
import { toast } from '@/components/ui/Toast';

interface SensorState {
  sensors: Sensor[];
  selectedSensor: Sensor | null;
  realtimeValues: Map<string, SensorDataPoint>;
  isLoading: boolean;

  fetchSensors: () => Promise<void>;
  selectSensor: (sensor: Sensor | null) => void;
  overrideSensor: (id: string, value: number) => Promise<void>;
  clearOverride: (id: string) => Promise<void>;
  startStream: (id: string, config: StartStreamConfig) => Promise<void>;
  stopStream: (id: string) => Promise<void>;
  updateRealtimeValue: (data: SensorDataPoint) => void;
  getRealtimeValue: (sensorId: string) => number | undefined;
  initWebSocket: (tenantId?: string) => void;
}

export const useSensorStore = create<SensorState>((set, get) => ({
  sensors: [],
  selectedSensor: null,
  realtimeValues: new Map(),
  isLoading: false,

  fetchSensors: async () => {
    set({ isLoading: true });
    try {
      const { data } = await sensorsApi.list();
      set({ sensors: data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      toast.error('Failed to fetch sensors');
    }
  },

  selectSensor: (sensor) => set({ selectedSensor: sensor }),

  overrideSensor: async (id, value) => {
    try {
      await sensorsApi.override(id, value);
      toast.success(`Sensor overridden to ${value}`);
      await get().fetchSensors();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to set override');
      throw err;
    }
  },

  clearOverride: async (id) => {
    try {
      await sensorsApi.clearOverride(id);
      toast.success('Override cleared');
      await get().fetchSensors();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to clear override');
      throw err;
    }
  },

  startStream: async (id, config) => {
    try {
      await sensorsApi.startStream(id, config);
      toast.success(`Stream started (${config.pattern})`);
      await get().fetchSensors();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start stream');
      throw err;
    }
  },

  stopStream: async (id) => {
    try {
      await sensorsApi.stopStream(id);
      toast.success('Stream stopped');
      await get().fetchSensors();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to stop stream');
      throw err;
    }
  },

  updateRealtimeValue: (data) => {
    set((state) => {
      const newMap = new Map(state.realtimeValues);
      newMap.set(data.sensorId, data);
      return { realtimeValues: newMap };
    });
  },

  getRealtimeValue: (sensorId) => {
    return get().realtimeValues.get(sensorId)?.value;
  },

  initWebSocket: (tenantId?: string) => {
    wsService.connect();
    if (tenantId) {
      wsService.subscribeTenant(tenantId);
    }
    wsService.onAllSensorData((data) => {
      get().updateRealtimeValue(data);
    });
  },
}));
