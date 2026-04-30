import { Injectable } from '@nestjs/common';
import { TimescaleService } from '../../database/timescale.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly timescale: TimescaleService,
    private readonly redis: RedisService,
  ) {}

  async getSensorHistory(sensorId: string, from: Date, to: Date, limit?: number) {
    const cacheKey = `analytics:history:${sensorId}:${from.toISOString()}:${to.toISOString()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await this.timescale.querySensorData(sensorId, from, to, limit);
    // Cache for 30 seconds
    await this.redis.set(cacheKey, JSON.stringify(data), 30);
    return data;
  }

  async getSensorLatest(sensorId: string) {
    return this.timescale.queryLatest(sensorId);
  }

  async getSensorAggregated(
    sensorId: string,
    from: Date,
    to: Date,
    interval?: string,
  ) {
    const cacheKey = `analytics:agg:${sensorId}:${interval}:${from.toISOString()}:${to.toISOString()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await this.timescale.queryAggregated(sensorId, from, to, interval);
    await this.redis.set(cacheKey, JSON.stringify(data), 30);
    return data;
  }
}
