import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string) {
    return this.prisma.tenant.create({ data: { name } });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany();
  }

  async update(id: string, name: string) {
    await this.findById(id);
    return this.prisma.tenant.update({ where: { id }, data: { name } });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.tenant.delete({ where: { id } });
  }
}
