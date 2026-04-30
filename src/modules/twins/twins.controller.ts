import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TwinsService } from './twins.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('twins')
@Controller('twins')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class TwinsController {
  constructor(private readonly twinsService: TwinsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a digital twin' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; description?: string },
  ) {
    return this.twinsService.create(user.tenantId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all digital twins for tenant' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.twinsService.findAllByTenant(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get digital twin by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.twinsService.findById(id, user.tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update digital twin' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.twinsService.update(id, user.tenantId, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete digital twin' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.twinsService.remove(id, user.tenantId);
  }
}
