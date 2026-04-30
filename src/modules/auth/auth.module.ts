import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';

const googleStrategyProvider = {
  provide: GoogleStrategy,
  inject: [ConfigService, AuthService],
  useFactory: (config: ConfigService, authService: AuthService) => {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientID || clientID === 'nebulaTwin' || clientID.startsWith('your-')) {
      Logger.warn('Google OAuth not configured — skipping GoogleStrategy', 'AuthModule');
      return null;
    }
    return new GoogleStrategy(config, authService);
  },
};

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, googleStrategyProvider],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
