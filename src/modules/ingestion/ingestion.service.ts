import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SensorsService } from '../sensors/sensors.service';
import { RedisService } from '../../common/redis/redis.service';

export interface IngestPayload {
  sensor_id: string;
  value: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface BatchIngestPayload {
  data: IngestPayload[];
}

export interface IngestionMetrics {
  totalIngested: number;
  totalRejected: number;
  totalRateLimited: number;
}

const MAX_INGEST_PER_SENSOR_PER_SECOND = 20;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private metrics: IngestionMetrics = { totalIngested: 0, totalRejected: 0, totalRateLimited: 0 };

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly redis: RedisService,
  ) {}

  async ingestSingle(payload: IngestPayload): Promise<{ accepted: boolean; reason?: string }> {
    this.validatePayload(payload);

    // Rate limiting per sensor
    const rateLimited = await this.checkRateLimit(payload.sensor_id);
    if (rateLimited) {
      this.metrics.totalRateLimited++;
      this.logger.debug(`Rate limited: sensor=${payload.sensor_id}`);
      return { accepted: false, reason: 'rate_limited' };
    }

    const result = await this.sensorsService.ingestData(
      payload.sensor_id,
      payload.value,
      payload.metadata,
    );

    if (result.accepted) {
      this.metrics.totalIngested++;
      this.logger.debug(`Ingested: sensor=${payload.sensor_id} value=${payload.value}`);
    } else {
      this.metrics.totalRejected++;
      this.logger.debug(`Rejected: sensor=${payload.sensor_id} reason=${result.reason}`);
    }

    return result;
  }

  async ingestBatch(payload: BatchIngestPayload): Promise<{ ingested: number; rejected: number; errors: number }> {
    let ingested = 0;
    let rejected = 0;
    let errors = 0;

    // Process in parallel with concurrency limit
    const BATCH_SIZE = 10;
    for (let i = 0; i < payload.data.length; i += BATCH_SIZE) {
      const chunk = payload.data.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        chunk.map(async (item) => {
          this.validatePayload(item);
          return this.sensorsService.ingestData(item.sensor_id, item.value, item.metadata);
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.accepted) {
          ingested++;
        } else if (result.status === 'fulfilled') {
          rejected++;
        } else {
          errors++;
        }
      }
    }

    this.metrics.totalIngested += ingested;
    this.metrics.totalRejected += rejected;

    return { ingested, rejected, errors };
  }

  getMetrics(): IngestionMetrics {
    return { ...this.metrics };
  }

  private async checkRateLimit(sensorId: string): Promise<boolean> {
    const key = `ratelimit:ingest:${sensorId}`;
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, 1);
      }
      return count > MAX_INGEST_PER_SENSOR_PER_SECOND;
    } catch {
      // If Redis is down, allow ingestion
      return false;
    }
  }

  private validatePayload(payload: IngestPayload): void {
    if (!payload.sensor_id || typeof payload.sensor_id !== 'string') {
      throw new BadRequestException('sensor_id is required and must be a string');
    }
    if (typeof payload.value !== 'number' || isNaN(payload.value)) {
      throw new BadRequestException('value is required and must be a number');
    }
  }
}
