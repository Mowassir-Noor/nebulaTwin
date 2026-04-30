import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssetType } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    type: AssetType;
    twinId: string;
    parentId?: string;
  }) {
    return this.prisma.asset.create({ data });
  }

  async findByTwin(twinId: string) {
    return this.prisma.asset.findMany({
      where: { twinId },
      include: {
        children: { include: { children: { include: { children: true } } } },
        sensors: true,
      },
    });
  }

  async findById(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        children: true,
        sensors: true,
        parent: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async findRoots(twinId: string) {
    return this.prisma.asset.findMany({
      where: { twinId, parentId: null },
      include: {
        children: { include: { children: { include: { children: true } } } },
      },
    });
  }

  async update(id: string, data: { name?: string; type?: AssetType; parentId?: string }) {
    await this.findById(id);
    return this.prisma.asset.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.asset.delete({ where: { id } });
  }
}
