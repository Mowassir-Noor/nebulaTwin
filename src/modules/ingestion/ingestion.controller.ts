import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IngestionService, IngestPayload, BatchIngestPayload } from './ingestion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('ingestion')
@Controller('ingest')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest a single sensor data point via HTTP' })
  async ingestSingle(@Body() payload: IngestPayload) {
    const result = await this.ingestionService.ingestSingle(payload);
    return { status: result.accepted ? 'accepted' : 'rejected', reason: result.reason };
  }

  @Post('batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest a batch of sensor data points via HTTP' })
  async ingestBatch(@Body() payload: BatchIngestPayload) {
    return this.ingestionService.ingestBatch(payload);
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ingestion metrics' })
  async getMetrics() {
    return this.ingestionService.getMetrics();
  }
}
