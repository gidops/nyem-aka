import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

@Module({
  // Secrets and lifetimes are passed per call (access and refresh tokens use different ones).
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [
    AuthService,
    // APP_GUARD registers a guard for every route in the application.
    // Order matters: rate-limit first, then identify the caller, then check their role.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
