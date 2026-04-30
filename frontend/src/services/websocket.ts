import { io, type Socket } from 'socket.io-client';
import type { SensorDataPoint, AlertEvent } from '@/types';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
type StatusListener = (status: ConnectionStatus) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private sensorListeners = new Map<string, Set<(data: SensorDataPoint) => void>>();
  private alertListeners = new Set<(alert: AlertEvent) => void>();
  private statusListeners = new Set<StatusListener>();
  private _status: ConnectionStatus = 'disconnected';
  private pendingSubscriptions: Array<{ event: string; data: Record<string, string> }> = [];

  get status() {
    return this._status;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  connect() {
    if (this.socket?.connected) return;

    this.setStatus('connecting');

    this.socket = io('/realtime', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected:', this.socket?.id);
      this.setStatus('connected');
      // Re-subscribe to pending rooms on reconnect
      this.pendingSubscriptions.forEach(({ event, data }) => {
        this.socket?.emit(event, data);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      this.setStatus('disconnected');
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.setStatus('reconnecting');
    });

    this.socket.on('sensor:data', (data: SensorDataPoint) => {
      const sensorListeners = this.sensorListeners.get(data.sensorId);
      sensorListeners?.forEach((cb) => cb(data));
      const globalListeners = this.sensorListeners.get('*');
      globalListeners?.forEach((cb) => cb(data));
    });

    this.socket.on('alert', (alert: AlertEvent) => {
      this.alertListeners.forEach((cb) => cb(alert));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.pendingSubscriptions = [];
    this.setStatus('disconnected');
  }

  subscribeTenant(tenantId: string) {
    const sub = { event: 'subscribe:tenant', data: { tenantId } };
    this.pendingSubscriptions.push(sub);
    this.socket?.emit(sub.event, sub.data);
  }

  subscribeSensor(sensorId: string) {
    const sub = { event: 'subscribe:sensor', data: { sensorId } };
    this.pendingSubscriptions.push(sub);
    this.socket?.emit(sub.event, sub.data);
  }

  subscribeTwin(twinId: string) {
    const sub = { event: 'subscribe:twin', data: { twinId } };
    this.pendingSubscriptions.push(sub);
    this.socket?.emit(sub.event, sub.data);
  }

  unsubscribe(room: string) {
    this.socket?.emit('unsubscribe', { room });
    this.pendingSubscriptions = this.pendingSubscriptions.filter(
      (s) => !Object.values(s.data).includes(room.split(':')[1]),
    );
  }

  onSensorData(sensorId: string, callback: (data: SensorDataPoint) => void) {
    if (!this.sensorListeners.has(sensorId)) {
      this.sensorListeners.set(sensorId, new Set());
    }
    this.sensorListeners.get(sensorId)!.add(callback);
    return () => {
      this.sensorListeners.get(sensorId)?.delete(callback);
    };
  }

  onAllSensorData(callback: (data: SensorDataPoint) => void) {
    return this.onSensorData('*', callback);
  }

  onAlert(callback: (alert: AlertEvent) => void) {
    this.alertListeners.add(callback);
    return () => {
      this.alertListeners.delete(callback);
    };
  }

  onStatusChange(callback: StatusListener) {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  get connected() {
    return this.socket?.connected ?? false;
  }
}

export const wsService = new WebSocketService();
export default wsService;
