import { Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TimescaleService } from '../../database/timescale.service';
import { EventBusService } from '../../common/event-bus/event-bus.service';
import { SensorsService } from './sensors.service';
import { SensorMode, StreamPattern } from '@prisma/client';

export interface StartStreamDto {
  pattern: StreamPattern;
  interval_ms: number;
  min: number;
  max: number;
}

@Injectable()
export class SensorStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SensorStreamService.name);
  private readonly activeStreams = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly timescale: TimescaleService,
    private readonly eventBus: EventBusService,
    private readonly sensorsService: SensorsService,
  ) {}

  onModuleInit() {
    // Register stop callback so SensorsService can stop streams without circular dep
    this.sensorsService.registerStopStreamCallback((sensorId: string) => {
      this.stopStreamInternal(sensorId);
    });
    this.logger.log('Stream service initialized, stop callback registered');
  }

  async startStream(sensorId: string, tenantId: string, dto: StartStreamDto) {
    // Prevent duplicate streams
    if (this.activeStreams.has(sensorId)) {
      this.stopStreamInternal(sensorId);
      this.logger.log(`Stopped existing stream on sensor ${sensorId} before starting new one`);
    }

    const sensor = await this.prisma.sensor.findFirst({
      where: { id: sensorId, tenantId },
    });
    if (!sensor) throw new NotFoundException('Sensor not found');

    // SINGLE SOURCE OF TRUTH: clear manual override, set to STREAM mode
    await this.prisma.sensor.update({
      where: { id: sensorId },
      data: {
        mode: SensorMode.STREAM,
        manualValue: null,
        streamPattern: dto.pattern,
        streamInterval: dto.interval_ms,
        streamMin: dto.min,
        streamMax: dto.max,
        streamActive: true,
      },
    });

    // Start generating values
    let tick = 0;
    const interval = setInterval(async () => {
      try {
        // Double-check stream is still active (may have been stopped externally)
        if (!this.activeStreams.has(sensorId)) {
          return;
        }

        const value = this.generateValue(dto.pattern, dto.min, dto.max, tick);
        tick++;

        // Store in TimescaleDB
        await this.timescale.insertSensorData(sensorId, value, {
          mode: 'stream',
          pattern: dto.pattern,
        });

        // Publish event
        await this.eventBus.publishSensorData({
          sensorId,
          tenantId,
          value,
          timestamp: new Date().toISOString(),
          mode: 'stream',
          metadata: { pattern: dto.pattern },
        });
      } catch (err) {
        this.logger.error(`Stream error for sensor ${sensorId}`, (err as Error).stack);
      }
    }, dto.interval_ms);

    this.activeStreams.set(sensorId, interval);
    this.logger.log(
      `Stream started for sensor ${sensorId}: pattern=${dto.pattern}, interval=${dto.interval_ms}ms`,
    );

    return { sensorId, streaming: true, pattern: dto.pattern };
  }

  async stopStream(sensorId: string, tenantId: string) {
    const sensor = await this.prisma.sensor.findFirst({
      where: { id: sensorId, tenantId },
    });
    if (!sensor) throw new NotFoundException('Sensor not found');

    this.stopStreamInternal(sensorId);

    await this.prisma.sensor.update({
      where: { id: sensorId },
      data: {
        mode: SensorMode.REAL,
        streamActive: false,
        streamPattern: null,
        streamInterval: null,
        streamMin: null,
        streamMax: null,
        manualValue: null,
      },
    });

    this.logger.log(`Stream stopped for sensor ${sensorId}`);
    return { sensorId, streaming: false };
  }

  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  isStreaming(sensorId: string): boolean {
    return this.activeStreams.has(sensorId);
  }

  stopStreamInternal(sensorId: string) {
    const existing = this.activeStreams.get(sensorId);
    if (existing) {
      clearInterval(existing);
      this.activeStreams.delete(sensorId);
      this.logger.log(`Stream interval cleared for sensor ${sensorId}`);
    }
  }

  // ─── Stream Pattern Generators ─────────────────────────────

  private generateValue(
    pattern: StreamPattern,
    min: number,
    max: number,
    tick: number,
  ): number {
    const range = max - min;

    switch (pattern) {
      case StreamPattern.CONSTANT:
        return (min + max) / 2;

      case StreamPattern.LINEAR_INCREASE: {
        const progress = (tick % 100) / 100;
        return min + range * progress;
      }

      case StreamPattern.LINEAR_DECREASE: {
        const progress = (tick % 100) / 100;
        return max - range * progress;
      }

      case StreamPattern.SINE: {
        const radians = (tick / 100) * 2 * Math.PI;
        const normalized = (Math.sin(radians) + 1) / 2;
        return min + range * normalized;
      }

      case StreamPattern.RANDOM: {
        return min + Math.random() * range;
      }

      default:
        return (min + max) / 2;
    }
  }

  onModuleDestroy() {
    for (const [sensorId, interval] of this.activeStreams) {
      clearInterval(interval);
      this.logger.log(`Cleaned up stream for sensor ${sensorId}`);
    }
    this.activeStreams.clear();
  }
}
