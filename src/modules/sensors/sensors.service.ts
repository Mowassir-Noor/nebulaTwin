import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TimescaleService } from '../../database/timescale.service';
import { EventBusService } from '../../common/event-bus/event-bus.service';
import { SensorMode, AlertSeverity } from '@prisma/client';

export interface IngestResult {
  accepted: boolean;
  reason?: string;
}

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);
  // Callback so stream service can be injected without circular dep
  private stopStreamCallback: ((sensorId: string) => void) | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly timescale: TimescaleService,
    private readonly eventBus: EventBusService,
  ) {}

  registerStopStreamCallback(cb: (sensorId: string) => void) {
    this.stopStreamCallback = cb;
  }

  // ─── CRUD ──────────────────────────────────────────────────

  async create(tenantId: string, data: {
    name: string;
    type: string;
    unit: string;
    modelPartId?: string;
    assetId?: string;
  }) {
    return this.prisma.sensor.create({
      data: { ...data, tenantId },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.sensor.findMany({
      where: { tenantId },
      include: { modelPart: true, asset: true },
    });
  }

  async findById(id: string, tenantId: string) {
    const sensor = await this.prisma.sensor.findFirst({
      where: { id, tenantId },
      include: { modelPart: true, asset: true },
    });
    if (!sensor) throw new NotFoundException('Sensor not found');
    return sensor;
  }

  async findByAsset(assetId: string, tenantId: string) {
    return this.prisma.sensor.findMany({
      where: { assetId, tenantId },
    });
  }

  async findByModelPart(modelPartId: string, tenantId: string) {
    return this.prisma.sensor.findMany({
      where: { modelPartId, tenantId },
    });
  }

  async update(id: string, tenantId: string, data: {
    name?: string;
    type?: string;
    unit?: string;
    modelPartId?: string;
    assetId?: string;
    alertMinThreshold?: number | null;
    alertMaxThreshold?: number | null;
  }) {
    await this.findById(id, tenantId);
    return this.prisma.sensor.update({ where: { id }, data });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    // Stop any running stream first
    this.stopStreamCallback?.(id);
    return this.prisma.sensor.delete({ where: { id } });
  }

  // ─── Manual Override (SINGLE SOURCE OF TRUTH) ──────────────
  async setOverride(id: string, tenantId: string, value: number) {
    const sensor = await this.findById(id, tenantId);

    // Stop any active stream before applying manual override
    if (sensor.streamActive) {
      this.stopStreamCallback?.(id);
      this.logger.log(`Stopped active stream on sensor ${id} before manual override`);
    }

    const updated = await this.prisma.sensor.update({
      where: { id },
      data: {
        mode: SensorMode.MANUAL,
        manualValue: value,
        streamActive: false,
        streamPattern: null,
        streamInterval: null,
        streamMin: null,
        streamMax: null,
      },
    });

    // Store the manual value in TimescaleDB
    await this.timescale.insertSensorData(id, value, { mode: 'manual' });

    // Publish to event bus
    await this.eventBus.publishSensorData({
      sensorId: id,
      tenantId: sensor.tenantId,
      value,
      timestamp: new Date().toISOString(),
      mode: 'manual',
    });

    // Check alert thresholds
    await this.checkAlertThresholds(sensor, value);

    this.logger.log(`Sensor ${id} overridden with value ${value}`);
    return updated;
  }

  async clearOverride(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.sensor.update({
      where: { id },
      data: {
        mode: SensorMode.REAL,
        manualValue: null,
      },
    });
  }

  // ─── Bind sensor to model part ─────────────────────────────
  async bindToModelPart(sensorId: string, modelPartId: string, tenantId: string) {
    await this.findById(sensorId, tenantId);
    return this.prisma.sensor.update({
      where: { id: sensorId },
      data: { modelPartId },
    });
  }

  async unbindFromModelPart(sensorId: string, tenantId: string) {
    await this.findById(sensorId, tenantId);
    return this.prisma.sensor.update({
      where: { id: sensorId },
      data: { modelPartId: null },
    });
  }

  // ─── Ingest real data (called by ingestion module) ─────────
  async ingestData(sensorId: string, value: number, metadata?: Record<string, unknown>): Promise<IngestResult> {
    const sensor = await this.prisma.sensor.findUnique({ where: { id: sensorId } });
    if (!sensor) {
      this.logger.warn(`Ingest: sensor ${sensorId} not found`);
      return { accepted: false, reason: 'sensor_not_found' };
    }

    // SINGLE SOURCE OF TRUTH: reject if sensor is in MANUAL or STREAM mode
    if (sensor.mode === SensorMode.MANUAL) {
      this.logger.debug(`Ingest rejected: sensor ${sensorId} in MANUAL mode`);
      return { accepted: false, reason: 'sensor_in_manual_mode' };
    }
    if (sensor.mode === SensorMode.STREAM) {
      this.logger.debug(`Ingest rejected: sensor ${sensorId} in STREAM mode`);
      return { accepted: false, reason: 'sensor_in_stream_mode' };
    }

    await this.timescale.insertSensorData(sensorId, value, metadata);

    await this.eventBus.publishSensorData({
      sensorId,
      tenantId: sensor.tenantId,
      value,
      timestamp: new Date().toISOString(),
      mode: 'real',
      metadata,
    });

    // Check alert thresholds
    await this.checkAlertThresholds(sensor, value);

    return { accepted: true };
  }

  // ─── Alert Threshold Check ─────────────────────────────────
  private async checkAlertThresholds(
    sensor: { id: string; name: string; tenantId: string; alertMinThreshold: number | null; alertMaxThreshold: number | null },
    value: number,
  ): Promise<void> {
    const min = sensor.alertMinThreshold;
    const max = sensor.alertMaxThreshold;

    if (min === null && max === null) return;

    let severity: AlertSeverity | null = null;
    let message = '';

    if (max !== null && value > max) {
      const overBy = value - max;
      const range = max - (min ?? 0);
      severity = range > 0 && overBy > range * 0.5 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
      message = `${sensor.name}: value ${value.toFixed(2)} exceeds max threshold ${max}`;
    } else if (min !== null && value < min) {
      const underBy = min - value;
      const range = (max ?? 100) - min;
      severity = range > 0 && underBy > range * 0.5 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
      message = `${sensor.name}: value ${value.toFixed(2)} below min threshold ${min}`;
    }

    if (severity) {
      const alert = await this.prisma.alert.create({
        data: {
          severity,
          message,
          value,
          sensorId: sensor.id,
          tenantId: sensor.tenantId,
        },
      });

      // Publish alert via event bus
      await this.eventBus.publishAlert({
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        sensorId: alert.sensorId,
        tenantId: alert.tenantId,
        createdAt: alert.createdAt.toISOString(),
      });

      this.logger.warn(`Alert [${severity}] ${message}`);
    }
  }
}
