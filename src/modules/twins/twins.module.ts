import { Module } from '@nestjs/common';
import { TwinsService } from './twins.service';
import { TwinsController } from './twins.controller';

@Module({
  controllers: [TwinsController],
  providers: [TwinsService],
  exports: [TwinsService],
})
export class TwinsModule {}
