import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name?: string;
    tenantId: string;
    role?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        tenantId: data.tenantId,
        role: (data.role as Role) || Role.VIEWER,
      },
    });
  }

  async createGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
  }) {
    // Create a default tenant for new Google users
    const tenant = await this.prisma.tenant.create({
      data: { name: `${profile.name}'s Organization` },
    });

    return this.prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.googleId,
        name: profile.name,
        tenantId: tenant.id,
        role: Role.ADMIN,
      },
    });
  }

  async linkGoogle(userId: string, googleId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    const hashed = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateRole(userId: string, role: Role, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('User not found in tenant');
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }
}
