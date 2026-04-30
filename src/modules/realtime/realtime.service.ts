import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { RealtimeGateway } from './realtime.gateway';
import { CHANNELS, SensorEvent, AlertEvent } from '../../common/event-bus/event-bus.service';

@Injectable()
export class RealtimeService implements OnModuleInit {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('Realtime service initializing subscriptions...');
    await this.setupGlobalListener();
    await this.setupAlertListener();
  }

  private async setupGlobalListener() {
    // Use psubscribe for glob pattern matching on sensor:data:*
    await this.redis.psubscribe(`${CHANNELS.SENSOR_DATA}:*`, (_channel: string, message: string) => {
      try {
        const event: SensorEvent = JSON.parse(message);
        this.gateway.broadcastSensorData(event);
      } catch (err) {
        this.logger.error('Failed to process sensor event for broadcast', (err as Error).message);
      }
    });
    this.logger.log('Global sensor data listener active (psubscribe)');
  }

  private async setupAlertListener() {
    await this.redis.psubscribe(`${CHANNELS.ALERT}:*`, (_channel: string, message: string) => {
      try {
        const alert: AlertEvent = JSON.parse(message);
        this.gateway.broadcastAlert(alert);
      } catch (err) {
        this.logger.error('Failed to process alert for broadcast', (err as Error).message);
      }
    });
    this.logger.log('Global alert listener active (psubscribe)');
  }
}
