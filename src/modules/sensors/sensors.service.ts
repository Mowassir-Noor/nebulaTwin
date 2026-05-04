import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TimescaleService } from '../../database/timescale.service';
import { EventBusService } from '../../common/event-bus/event-bus.service';
import { AnomalyDetectionService } from '../anomaly/anomaly-detection.service';
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
  // Alert cooldown tracking (sensorId -> last alert timestamp)
  private readonly lastAlertTime = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly timescale: TimescaleService,
    private readonly eventBus: EventBusService,
    private readonly anomalyService: AnomalyDetectionService,
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
    const sensor = await this.findById(sensorId, tenantId);

    // Validate model part exists, belongs to tenant's model
    const part = await this.prisma.modelPart.findUnique({
      where: { id: modelPartId },
      include: { model: { include: { twin: true } } },
    });
    if (!part || part.model.tenantId !== tenantId) {
      throw new NotFoundException('Model part not found');
    }

    // Enforce twin-scoped integrity: if the sensor has an asset, it must belong
    // to the same twin as the model being bound to
    if (sensor.assetId) {
      const asset = await this.prisma.asset.findUnique({ where: { id: sensor.assetId } });
      if (asset && asset.twinId !== part.model.twinId) {
        throw new BadRequestException(
          'Sensor belongs to a different twin than the target model part',
        );
      }
    }

    return this.prisma.sensor.update({
      where: { id: sensorId },
      data: { modelPartId },
      include: { modelPart: true },
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

    // Anomaly detection
    const anomaly = this.anomalyService.analyzeValue(sensorId, value);
    if (anomaly.isAnomaly) {
      await this.createAnomalyAlert(sensor, value, anomaly.anomalyScore, anomaly.reason);
    }

    return { accepted: true };
  }

  // ─── Device Validation ───────────────────────────────
  validatePayload(sensor: { validationSchema: any }, value: number, metadata?: Record<string, unknown>): void {
    const schema = sensor.validationSchema as any;
    if (!schema) return;

    if (schema.minValue !== undefined && value < schema.minValue) {
      throw new BadRequestException(`Value ${value} below minimum ${schema.minValue} for sensor type`);
    }
    if (schema.maxValue !== undefined && value > schema.maxValue) {
      throw new BadRequestException(`Value ${value} above maximum ${schema.maxValue} for sensor type`);
    }
    if (schema.valueType === 'integer' && !Number.isInteger(value)) {
      throw new BadRequestException(`Sensor requires integer values, got ${value}`);
    }
    if (schema.requiredMetadata && metadata) {
      for (const key of schema.requiredMetadata) {
        if (!(key in metadata)) {
          throw new BadRequestException(`Missing required metadata field: ${key}`);
        }
      }
    }
  }

  // ─── Alert Threshold Check (with cooldown + hysteresis) ────
  private async checkAlertThresholds(
    sensor: {
      id: string; name: string; tenantId: string;
      alertMinThreshold: number | null; alertMaxThreshold: number | null;
      alertCooldownMs?: number | null; alertHysteresis?: number | null;
    },
    value: number,
  ): Promise<void> {
    const min = sensor.alertMinThreshold;
    const max = sensor.alertMaxThreshold;

    if (min === null && max === null) return;

    // Cooldown check: skip if recent alert exists
    const cooldownMs = sensor.alertCooldownMs ?? 30_000; // default 30s
    const lastAlert = this.lastAlertTime.get(sensor.id);
    if (lastAlert && Date.now() - lastAlert < cooldownMs) {
      return;
    }

    // Hysteresis: value must exceed threshold by hysteresis amount
    const hysteresis = sensor.alertHysteresis ?? 0;

    let severity: AlertSeverity | null = null;
    let message = '';

    if (max !== null && value > max + hysteresis) {
      const overBy = value - max;
      const range = max - (min ?? 0);
      severity = range > 0 && overBy > range * 0.5 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
      message = `${sensor.name}: value ${value.toFixed(2)} exceeds max threshold ${max}`;
    } else if (min !== null && value < min - hysteresis) {
      const underBy = min - value;
      const range = (max ?? 100) - min;
      severity = range > 0 && underBy > range * 0.5 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
      message = `${sensor.name}: value ${value.toFixed(2)} below min threshold ${min}`;
    }

    if (severity) {
      await this.createAndPublishAlert(sensor.id, sensor.name, sensor.tenantId, severity, message, value);
    }
  }

  // ─── Anomaly Alert ───────────────────────────────────
  private async createAnomalyAlert(
    sensor: { id: string; name: string; tenantId: string },
    value: number,
    anomalyScore: number,
    reason: string,
  ): Promise<void> {
    // Cooldown: no repeated anomaly alerts within 60s
    const lastAlert = this.lastAlertTime.get(`anomaly:${sensor.id}`);
    if (lastAlert && Date.now() - lastAlert < 60_000) return;

    const severity = anomalyScore >= 80 ? AlertSeverity.WARNING : AlertSeverity.INFO;
    const message = `${sensor.name}: anomaly detected (score=${anomalyScore}, ${reason}), value=${value.toFixed(2)}`;

    await this.createAndPublishAlert(sensor.id, sensor.name, sensor.tenantId, severity, message, value);
    this.lastAlertTime.set(`anomaly:${sensor.id}`, Date.now());
  }

  // ─── Shared alert creation ──────────────────────────
  private async createAndPublishAlert(
    sensorId: string,
    sensorName: string,
    tenantId: string,
    severity: AlertSeverity,
    message: string,
    value: number,
  ): Promise<void> {
    const alert = await this.prisma.alert.create({
      data: { severity, message, value, sensorId, tenantId },
    });

    await this.eventBus.publishAlert({
      id: alert.id,
      severity: alert.severity,
      message: alert.message,
      value: alert.value,
      sensorId: alert.sensorId,
      tenantId: alert.tenantId,
      createdAt: alert.createdAt.toISOString(),
    });

    this.lastAlertTime.set(sensorId, Date.now());
    this.logger.warn(`Alert [${severity}] ${message}`);
  }
}
