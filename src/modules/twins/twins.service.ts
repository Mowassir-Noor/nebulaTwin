import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TwinsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, data: { name: string; description?: string }) {
    return this.prisma.digitalTwin.create({
      data: { ...data, tenantId },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.digitalTwin.findMany({
      where: { tenantId },
      include: {
        assets: { where: { parentId: null }, include: { children: true } },
        models: true,
      },
    });
  }

  async findById(id: string, tenantId: string) {
    const twin = await this.prisma.digitalTwin.findFirst({
      where: { id, tenantId },
      include: {
        assets: {
          include: {
            children: { include: { children: { include: { children: true } } } },
            sensors: true,
          },
        },
        models: { include: { modelParts: true } },
      },
    });
    if (!twin) throw new NotFoundException('Digital twin not found');
    return twin;
  }

  async update(id: string, tenantId: string, data: { name?: string; description?: string }) {
    await this.findById(id, tenantId);
    return this.prisma.digitalTwin.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.digitalTwin.delete({ where: { id } });
  }
}
