import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [RequestsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
