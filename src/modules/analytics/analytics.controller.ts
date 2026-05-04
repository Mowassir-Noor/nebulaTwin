import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sensors/:sensorId/history')
  @ApiOperation({ summary: 'Get sensor data history' })
  @ApiQuery({ name: 'from', required: true, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: true, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSensorHistory(
    @Param('sensorId') sensorId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: number,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format for "from" or "to" parameter. Use ISO 8601.');
    }
    return this.analyticsService.getSensorHistory(sensorId, fromDate, toDate, limit);
  }

  @Get('sensors/:sensorId/latest')
  @ApiOperation({ summary: 'Get latest sensor data point' })
  async getSensorLatest(@Param('sensorId') sensorId: string) {
    return this.analyticsService.getSensorLatest(sensorId);
  }

  @Get('sensors/:sensorId/aggregated')
  @ApiOperation({ summary: 'Get aggregated sensor data (TimescaleDB time_bucket)' })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  @ApiQuery({ name: 'interval', required: false, type: String, description: 'e.g. "1 minute", "5 minutes", "1 hour"' })
  async getSensorAggregated(
    @Param('sensorId') sensorId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('interval') interval?: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format for "from" or "to" parameter. Use ISO 8601.');
    }
    return this.analyticsService.getSensorAggregated(sensorId, fromDate, toDate, interval);
  }
}
