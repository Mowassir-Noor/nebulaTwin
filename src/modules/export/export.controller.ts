import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('sensors/:sensorId/csv')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export sensor data as CSV' })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  async exportSensorCsv(
    @Param('sensorId') sensorId: string,
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportSensorCsv(
      sensorId,
      user.tenantId,
      new Date(from),
      new Date(to),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sensor_${sensorId}.csv`);
    res.send(csv);
  }

  @Get('twins/:twinId/json')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export twin configuration as JSON' })
  async exportTwinJson(
    @Param('twinId') twinId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exportService.exportTwinJson(twinId, user.tenantId);
  }

  @Post('twins/:twinId/share')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a public read-only share link for a twin' })
  async createShareLink(
    @Param('twinId') twinId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const token = this.exportService.createShareToken(twinId, user.tenantId);
    return { token, url: `/api/v1/export/shared/${token}` };
  }

  @Get('shared/:token')
  @ApiOperation({ summary: 'Access shared twin (public, no auth)' })
  async getSharedTwin(@Param('token') token: string) {
    const data = await this.exportService.getSharedTwin(token);
    if (!data) throw new NotFoundException('Share link expired or not found');
    return data;
  }

  @Delete('shared/:token')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a share link' })
  async revokeShareLink(@Param('token') token: string) {
    this.exportService.revokeShareToken(token);
    return { revoked: true };
  }
}
