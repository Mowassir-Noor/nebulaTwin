import { Module } from '@nestjs/common';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AnomalyDetectionService],
  exports: [AnomalyDetectionService],
})
export class AnomalyModule {}
