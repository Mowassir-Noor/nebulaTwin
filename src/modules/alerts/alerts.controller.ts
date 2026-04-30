import {
  Controller, Get, Post, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List alerts for tenant' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.findByTenant(user.tenantId, limit);
  }

  @Get('unacknowledged')
  @ApiOperation({ summary: 'List unacknowledged alerts' })
  async findUnacknowledged(@CurrentUser() user: JwtPayload) {
    return this.alertsService.findUnacknowledged(user.tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get alert statistics' })
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.alertsService.getStats(user.tenantId);
  }

  @Get('sensor/:sensorId')
  @ApiOperation({ summary: 'List alerts for a sensor' })
  async findBySensor(
    @Param('sensorId') sensorId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertsService.findBySensor(sensorId, user.tenantId);
  }

  @Post(':id/acknowledge')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an alert' })
  async acknowledge(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertsService.acknowledge(id, user.tenantId);
  }

  @Post('acknowledge-all')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge all alerts' })
  async acknowledgeAll(@CurrentUser() user: JwtPayload) {
    return this.alertsService.acknowledgeAll(user.tenantId);
  }
}
