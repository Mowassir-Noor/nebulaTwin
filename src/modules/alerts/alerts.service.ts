import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string, limit?: number) {
    return this.prisma.alert.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : { take: 50 }),
      include: { sensor: { select: { id: true, name: true, type: true, unit: true } } },
    });
  }

  async findBySensor(sensorId: string, tenantId: string, limit?: number) {
    return this.prisma.alert.findMany({
      where: { sensorId, tenantId },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : { take: 50 }),
    });
  }

  async findUnacknowledged(tenantId: string) {
    return this.prisma.alert.findMany({
      where: { tenantId, acknowledged: false },
      orderBy: { createdAt: 'desc' },
      include: { sensor: { select: { id: true, name: true, type: true, unit: true } } },
    });
  }

  async acknowledge(id: string, tenantId: string) {
    return this.prisma.alert.updateMany({
      where: { id, tenantId },
      data: { acknowledged: true },
    });
  }

  async acknowledgeAll(tenantId: string) {
    return this.prisma.alert.updateMany({
      where: { tenantId, acknowledged: false },
      data: { acknowledged: true },
    });
  }

  async getStats(tenantId: string) {
    const [total, unacknowledged, critical, warning] = await Promise.all([
      this.prisma.alert.count({ where: { tenantId } }),
      this.prisma.alert.count({ where: { tenantId, acknowledged: false } }),
      this.prisma.alert.count({ where: { tenantId, severity: 'CRITICAL' } }),
      this.prisma.alert.count({ where: { tenantId, severity: 'WARNING' } }),
    ]);
    return { total, unacknowledged, critical, warning };
  }
}
