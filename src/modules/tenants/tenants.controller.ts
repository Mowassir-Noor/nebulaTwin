import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new tenant' })
  async create(@Body('name') name: string) {
    return this.tenantsService.create(name);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all tenants' })
  async findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update tenant' })
  async update(@Param('id') id: string, @Body('name') name: string) {
    return this.tenantsService.update(id, name);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete tenant' })
  async remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
