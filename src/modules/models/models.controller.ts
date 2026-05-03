import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ModelsService } from './models.service';

@ApiTags('models')
@ApiBearerAuth()
@Controller('models')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a 3D model' })
  async upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateModelDto,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!body.twinId) throw new BadRequestException('twinId is required');
    return this.modelsService.uploadModel(user.tenantId, file, body);
  }

  @Post(':id/version')
  @Roles('ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new version of an existing model' })
  async uploadNewVersion(
    @Param('id') parentModelId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UpdateModelDto,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.modelsService.uploadNewVersion(user.tenantId, parentModelId, file, body);
  }

  @Get()
  @ApiOperation({ summary: 'List 3D models for tenant' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('twinId') twinId?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.modelsService.findAllByTenant(user.tenantId, twinId, includeDeleted === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get 3D model by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.modelsService.findById(id, user.tenantId);
  }

  @Get(':id/bound-sensors')
  @ApiOperation({ summary: 'Get count of sensors bound to this model' })
  async getBoundSensors(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const count = await this.modelsService.getBoundSensorCount(id, user.tenantId);
    return { count };
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history of a model' })
  async getVersionHistory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.modelsService.getVersionHistory(id, user.tenantId);
  }

  @Post(':id/rollback')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Rollback to a specific model version' })
  async rollback(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.modelsService.rollbackToVersion(id, user.tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update 3D model metadata' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateModelDto,
  ) {
    return this.modelsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a 3D model' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.modelsService.remove(id, user.tenantId);
  }

  @Post(':id/restore')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Restore a soft-deleted model' })
  async restore(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.modelsService.restore(id, user.tenantId);
  }

  @Delete(':id/permanent')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a model (ADMIN only)' })
  async permanentRemove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.modelsService.permanentRemove(id, user.tenantId);
  }
}
