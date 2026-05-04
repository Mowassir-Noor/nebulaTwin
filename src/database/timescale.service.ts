import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

export interface SensorDataPoint {
  time: Date;
  sensor_id: string;
  value: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TimescaleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimescaleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureSchema();
    this.logger.log('TimescaleDB service initialized');
  }

  private async ensureSchema(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE`);
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS sensor_data (
          time        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
          sensor_id   TEXT            NOT NULL,
          value       DOUBLE PRECISION NOT NULL,
          metadata    JSONB
        )
      `);
      await this.prisma.$executeRawUnsafe(
        `SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE)`,
      );
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_id
          ON sensor_data (sensor_id, time DESC)
      `);
      this.logger.log('TimescaleDB schema ready');
    } catch (err) {
      this.logger.error('TimescaleDB schema init failed', (err as Error).message);
    }
  }

  async onModuleDestroy() {
    this.logger.log('TimescaleDB service destroyed');
  }

  async insertSensorData(
    sensorId: string,
    value: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO sensor_data (time, sensor_id, value, metadata)
         VALUES (NOW(), $1, $2, $3::jsonb)
         ON CONFLICT DO NOTHING`,
        sensorId,
        value,
        metadata ? JSON.stringify(metadata) : null,
      );
    } catch (err) {
      this.logger.error(`Failed to insert sensor data for ${sensorId}`, (err as Error).message);
      throw err;
    }
  }

  async insertBatch(dataPoints: SensorDataPoint[]): Promise<void> {
    if (dataPoints.length === 0) return;

    const values = dataPoints
      .map(
        (_, i) =>
          `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}::jsonb)`,
      )
      .join(', ');

    const params = dataPoints.flatMap((dp) => [
      dp.time || new Date(),
      dp.sensor_id,
      dp.value,
      dp.metadata ? JSON.stringify(dp.metadata) : null,
    ]);

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO sensor_data (time, sensor_id, value, metadata) VALUES ${values}`,
      ...params,
    );
  }

  async querySensorData(
    sensorId: string,
    from: Date,
    to: Date,
    limit = 1000,
  ): Promise<SensorDataPoint[]> {
    const results = await this.prisma.$queryRawUnsafe<SensorDataPoint[]>(
      `SELECT time, sensor_id, value, metadata
       FROM sensor_data
       WHERE sensor_id = $1 AND time >= $2 AND time <= $3
       ORDER BY time DESC
       LIMIT $4`,
      sensorId,
      from,
      to,
      limit,
    );
    return results;
  }

  async queryLatest(sensorId: string): Promise<SensorDataPoint | null> {
    const results = await this.prisma.$queryRawUnsafe<SensorDataPoint[]>(
      `SELECT time, sensor_id, value, metadata
       FROM sensor_data
       WHERE sensor_id = $1
       ORDER BY time DESC
       LIMIT 1`,
      sensorId,
    );
    return results[0] || null;
  }

  async queryAggregated(
    sensorId: string,
    from: Date,
    to: Date,
    bucketInterval = '1 minute',
  ) {
    return this.prisma.$queryRawUnsafe(
      `SELECT
         time_bucket($1::interval, time) AS bucket,
         sensor_id,
         AVG(value) AS avg_value,
         MIN(value) AS min_value,
         MAX(value) AS max_value,
         COUNT(*) AS count
       FROM sensor_data
       WHERE sensor_id = $2 AND time >= $3 AND time <= $4
       GROUP BY bucket, sensor_id
       ORDER BY bucket DESC`,
      bucketInterval,
      sensorId,
      from,
      to,
    );
  }
}
