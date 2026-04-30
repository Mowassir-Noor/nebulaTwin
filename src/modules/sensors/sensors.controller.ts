import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { SensorStreamService } from './sensor-stream.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { OverrideSensorDto } from './dto/override-sensor.dto';
import { StartStreamDto } from './dto/start-stream.dto';

@ApiTags('sensors')
@Controller('sensors')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class SensorsController {
  constructor(
    private readonly sensorsService: SensorsService,
    private readonly streamService: SensorStreamService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────

  @Post()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Create a sensor' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSensorDto) {
    return this.sensorsService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all sensors for tenant' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.sensorsService.findAllByTenant(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sensor by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sensorsService.findById(id, user.tenantId);
  }

  @Get('by-asset/:assetId')
  @ApiOperation({ summary: 'Get sensors by asset' })
  async findByAsset(
    @Param('assetId') assetId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sensorsService.findByAsset(assetId, user.tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Update sensor' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Partial<CreateSensorDto>,
  ) {
    return this.sensorsService.update(id, user.tenantId, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete sensor' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sensorsService.remove(id, user.tenantId);
  }

  // ─── MANUAL OVERRIDE ──────────────────────────────────────

  @Post(':id/override')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set manual override value for sensor' })
  async setOverride(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: OverrideSensorDto,
  ) {
    return this.sensorsService.setOverride(id, user.tenantId, dto.value);
  }

  @Post(':id/override/clear')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear manual override, revert to real mode' })
  async clearOverride(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sensorsService.clearOverride(id, user.tenantId);
  }

  // ─── STREAM CONTROL ───────────────────────────────────────

  @Post(':id/stream')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a simulated data stream for sensor' })
  async startStream(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: StartStreamDto,
  ) {
    return this.streamService.startStream(id, user.tenantId, dto as any);
  }

  @Post(':id/stop')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a simulated data stream for sensor' })
  async stopStream(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.streamService.stopStream(id, user.tenantId);
  }

  @Get('streams/active')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all active sensor streams' })
  async getActiveStreams() {
    return { activeStreams: this.streamService.getActiveStreams() };
  }

  // ─── SENSOR BINDING ────────────────────────────────────────

  @Post(':id/bind/:modelPartId')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bind sensor to a 3D model part' })
  async bindToModelPart(
    @Param('id') id: string,
    @Param('modelPartId') modelPartId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sensorsService.bindToModelPart(id, modelPartId, user.tenantId);
  }

  @Post(':id/unbind')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unbind sensor from model part' })
  async unbindFromModelPart(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sensorsService.unbindFromModelPart(id, user.tenantId);
  }
}
