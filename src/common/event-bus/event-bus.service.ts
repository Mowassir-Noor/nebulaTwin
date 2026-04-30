import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface SensorEvent {
  sensorId: string;
  tenantId: string;
  twinId?: string;
  value: number;
  timestamp: string;
  mode: 'real' | 'manual' | 'stream';
  metadata?: Record<string, unknown>;
}

export interface AlertEvent {
  id: string;
  severity: string;
  message: string;
  value: number;
  sensorId: string;
  tenantId: string;
  createdAt: string;
}

export const CHANNELS = {
  SENSOR_DATA: 'sensor:data',
  SENSOR_OVERRIDE: 'sensor:override',
  SENSOR_STREAM: 'sensor:stream',
  TWIN_UPDATE: 'twin:update',
  ALERT: 'alert',
} as const;

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly redis: RedisService) {}

  async publishSensorData(event: SensorEvent): Promise<void> {
    const channel = `${CHANNELS.SENSOR_DATA}:${event.tenantId}`;
    await this.redis.publish(channel, JSON.stringify(event));

    // Also publish to sensor-specific channel
    const sensorChannel = `${CHANNELS.SENSOR_DATA}:${event.sensorId}`;
    await this.redis.publish(sensorChannel, JSON.stringify(event));
  }

  async publishAlert(event: AlertEvent): Promise<void> {
    const channel = `${CHANNELS.ALERT}:${event.tenantId}`;
    await this.redis.publish(channel, JSON.stringify(event));
  }

  async subscribeSensorData(
    tenantId: string,
    callback: (event: SensorEvent) => void,
  ): Promise<void> {
    const channel = `${CHANNELS.SENSOR_DATA}:${tenantId}`;
    await this.redis.subscribe(channel, (msg) => {
      try {
        callback(JSON.parse(msg));
      } catch (err) {
        this.logger.error('Failed to parse sensor event', err);
      }
    });
  }

  async subscribeSensor(
    sensorId: string,
    callback: (event: SensorEvent) => void,
  ): Promise<void> {
    const channel = `${CHANNELS.SENSOR_DATA}:${sensorId}`;
    await this.redis.subscribe(channel, (msg) => {
      try {
        callback(JSON.parse(msg));
      } catch (err) {
        this.logger.error('Failed to parse sensor event', err);
      }
    });
  }

  async subscribeAlerts(
    tenantId: string,
    callback: (event: AlertEvent) => void,
  ): Promise<void> {
    const channel = `${CHANNELS.ALERT}:${tenantId}`;
    await this.redis.subscribe(channel, (msg) => {
      try {
        callback(JSON.parse(msg));
      } catch (err) {
        this.logger.error('Failed to parse alert event', err);
      }
    });
  }

  async publishOverride(sensorId: string, data: Record<string, unknown>): Promise<void> {
    await this.redis.publish(
      `${CHANNELS.SENSOR_OVERRIDE}:${sensorId}`,
      JSON.stringify(data),
    );
  }
}
