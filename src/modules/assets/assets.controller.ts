import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('assets')
@Controller('assets')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Create an asset' })
  async create(@Body() body: { name: string; type: string; twinId: string; parentId?: string }) {
    return this.assetsService.create(body as any);
  }

  @Get()
  @ApiOperation({ summary: 'List assets by twin' })
  async findByTwin(@Query('twinId') twinId: string) {
    return this.assetsService.findByTwin(twinId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  async findOne(@Param('id') id: string) {
    return this.assetsService.findById(id);
  }

  @Get('roots/:twinId')
  @ApiOperation({ summary: 'Get root assets for a twin' })
  async findRoots(@Param('twinId') twinId: string) {
    return this.assetsService.findRoots(twinId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Update asset' })
  async update(@Param('id') id: string, @Body() body: { name?: string; type?: string; parentId?: string }) {
    return this.assetsService.update(id, body as any);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete asset' })
  async remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
