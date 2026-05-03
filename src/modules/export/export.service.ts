import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TimescaleService } from '../../database/timescale.service';
import * as crypto from 'crypto';

@Injectable()
export class ExportService {
  // Share tokens: token -> { twinId, tenantId, expiresAt }
  private readonly shareTokens = new Map<string, { twinId: string; tenantId: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly timescale: TimescaleService,
  ) {}

  // ─── Export sensor data as CSV ──────────────────────────
  async exportSensorCsv(
    sensorId: string,
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<string> {
    const sensor = await this.prisma.sensor.findFirst({
      where: { id: sensorId, tenantId },
    });
    if (!sensor) throw new NotFoundException('Sensor not found');

    const data = await this.timescale.querySensorData(sensorId, from, to, 10000);

    const header = 'timestamp,sensor_id,sensor_name,value\n';
    const rows = (data || [])
      .map((d: any) => `${d.time},${sensorId},${sensor.name},${d.value}`)
      .join('\n');

    return header + rows;
  }

  // ─── Export twin config as JSON ─────────────────────────
  async exportTwinJson(twinId: string, tenantId: string): Promise<object> {
    const twin = await this.prisma.digitalTwin.findFirst({
      where: { id: twinId, tenantId },
      include: {
        assets: {
          include: { sensors: true },
        },
        models: {
          where: { deletedAt: null },
          include: { modelParts: true },
        },
      },
    });
    if (!twin) throw new NotFoundException('Twin not found');

    return {
      exportedAt: new Date().toISOString(),
      version: '0.4.0',
      twin: {
        id: twin.id,
        name: twin.name,
        description: twin.description,
        assets: twin.assets.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          parentId: a.parentId,
          sensors: a.sensors.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            unit: s.unit,
            alertMinThreshold: s.alertMinThreshold,
            alertMaxThreshold: s.alertMaxThreshold,
          })),
        })),
        models: twin.models.map((m) => ({
          id: m.id,
          name: m.name,
          format: m.format,
          version: m.version,
          parts: m.modelParts.map((p) => ({
            id: p.id,
            name: p.name,
          })),
        })),
      },
    };
  }

  // ─── Public share link ──────────────────────────────────
  createShareToken(twinId: string, tenantId: string, expiresInHours = 24): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.shareTokens.set(token, {
      twinId,
      tenantId,
      expiresAt: Date.now() + expiresInHours * 60 * 60 * 1000,
    });
    return token;
  }

  async getSharedTwin(token: string): Promise<object | null> {
    const share = this.shareTokens.get(token);
    if (!share) return null;
    if (Date.now() > share.expiresAt) {
      this.shareTokens.delete(token);
      return null;
    }
    return this.exportTwinJson(share.twinId, share.tenantId);
  }

  revokeShareToken(token: string): boolean {
    return this.shareTokens.delete(token);
  }
}
