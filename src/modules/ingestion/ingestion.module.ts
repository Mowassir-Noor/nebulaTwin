import { Module } from '@nestjs/common';
import { SensorsModule } from '../sensors/sensors.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { MqttIngestionService } from './mqtt-ingestion.service';

@Module({
  imports: [SensorsModule],
  controllers: [IngestionController],
  providers: [IngestionService, MqttIngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
