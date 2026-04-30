import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks: Record<string, { status: string; latencyMs?: number }> = {};

    // Database check
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up', latencyMs: Date.now() - start };
    } catch {
      checks.database = { status: 'down' };
    }

    // Redis check
    try {
      const start = Date.now();
      await this.redis.set('health:ping', 'pong', 5);
      const val = await this.redis.get('health:ping');
      checks.redis = {
        status: val === 'pong' ? 'up' : 'degraded',
        latencyMs: Date.now() - start,
      };
    } catch {
      checks.redis = { status: 'down' };
    }

    // TimescaleDB check (sensor_data table)
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1 FROM sensor_data LIMIT 0`;
      checks.timescaledb = { status: 'up', latencyMs: Date.now() - start };
    } catch {
      checks.timescaledb = { status: 'down' };
    }

    const allUp = Object.values(checks).every((c) => c.status === 'up');

    return {
      status: allUp ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not_ready' };
    }
  }
}
