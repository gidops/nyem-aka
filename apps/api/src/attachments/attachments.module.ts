import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module.js';
import { AttachmentsController } from './attachments.controller.js';
import { AttachmentsService } from './attachments.service.js';
import { storageProvider } from './storage/storage.provider.js';

@Module({
  imports: [RequestsModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, storageProvider],
})
export class AttachmentsModule {}
