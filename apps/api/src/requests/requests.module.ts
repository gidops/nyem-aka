import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller.js';
import { RequestsService } from './requests.service.js';

@Module({
  controllers: [RequestsController],
  providers: [RequestsService],
  // Exported so the attachments module can reuse the visibility rules.
  exports: [RequestsService],
})
export class RequestsModule {}
