import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';
import { SensorStreamService } from './sensor-stream.service';
import { AnomalyModule } from '../anomaly/anomaly.module';

@Module({
  imports: [AnomalyModule],
  controllers: [SensorsController],
  providers: [SensorsService, SensorStreamService],
  exports: [SensorsService, SensorStreamService],
})
export class SensorsModule {}
