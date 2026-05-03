import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { EventBusModule } from './common/event-bus/event-bus.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TwinsModule } from './modules/twins/twins.module';
import { AssetsModule } from './modules/assets/assets.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { HealthModule } from './modules/health/health.module';
import { ModelsModule } from './modules/models/models.module';
import { AnomalyModule } from './modules/anomaly/anomaly.module';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),

    // Scheduling (for sensor streams)
    ScheduleModule.forRoot(),

    // Infrastructure
    DatabaseModule,
    RedisModule,
    EventBusModule,

    // Feature modules
    AuthModule,
    UsersModule,
    TenantsModule,
    TwinsModule,
    AssetsModule,
    SensorsModule,
    IngestionModule,
    RealtimeModule,
    AnalyticsModule,
    AlertsModule,
    HealthModule,
    ModelsModule,
    AnomalyModule,
    ExportModule,
  ],
})
export class AppModule {}
