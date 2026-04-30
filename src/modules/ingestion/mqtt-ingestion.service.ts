import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IngestionService } from './ingestion.service';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttIngestionService.name);
  private client: mqtt.MqttClient | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly ingestionService: IngestionService,
  ) {}

  async onModuleInit() {
    const mqttUrl = this.config.get<string>('MQTT_URL');
    if (!mqttUrl) {
      this.logger.warn('MQTT_URL not configured, MQTT ingestion disabled');
      return;
    }

    try {
      this.client = mqtt.connect(mqttUrl, {
        username: this.config.get<string>('MQTT_USERNAME') || undefined,
        password: this.config.get<string>('MQTT_PASSWORD') || undefined,
        reconnectPeriod: 5000,
      });

      this.client.on('connect', () => {
        this.logger.log('Connected to MQTT broker');
        // Subscribe to sensor data topic
        this.client?.subscribe('nebula/sensors/+/data', { qos: 1 });
        this.client?.subscribe('nebula/sensors/batch', { qos: 1 });
      });

      this.client.on('message', async (topic: string, message: Buffer) => {
        try {
          await this.handleMessage(topic, message);
        } catch (err) {
          this.logger.error(`MQTT message error: ${(err as Error).message}`);
        }
      });

      this.client.on('error', (err: Error) => {
        this.logger.error(`MQTT error: ${err.message}`);
      });
    } catch (err) {
      this.logger.error(`MQTT connection failed: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.logger.log('MQTT client disconnected');
    }
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    const payload = JSON.parse(message.toString());

    // Topic: nebula/sensors/{sensorId}/data
    const singleMatch = topic.match(/^nebula\/sensors\/(.+)\/data$/);
    if (singleMatch) {
      const sensorId = singleMatch[1];
      await this.ingestionService.ingestSingle({
        sensor_id: sensorId,
        value: payload.value,
        metadata: payload.metadata,
      });
      return;
    }

    // Topic: nebula/sensors/batch
    if (topic === 'nebula/sensors/batch' && Array.isArray(payload.data)) {
      await this.ingestionService.ingestBatch(payload);
      return;
    }

    this.logger.warn(`Unhandled MQTT topic: ${topic}`);
  }
}
