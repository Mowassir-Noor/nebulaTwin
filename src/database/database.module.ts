import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TimescaleService } from './timescale.service';

@Global()
@Module({
  providers: [PrismaService, TimescaleService],
  exports: [PrismaService, TimescaleService],
})
export class DatabaseModule {}
