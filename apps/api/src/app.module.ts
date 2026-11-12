import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    // Loads apps/api/.env and makes ConfigService injectable everywhere.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
