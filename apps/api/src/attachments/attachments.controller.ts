import {
  Controller,
  Delete,
  Ip,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  AttachmentsService,
  MAX_ATTACHMENT_BYTES,
} from './attachments.service.js';

@ApiTags('attachments')
@ApiCookieAuth()
@Controller()
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  // FileInterceptor reads the multipart form and holds the file in memory.
  // The size limit is enforced while the upload streams in, so an oversized file
  // is cut off early (413) instead of being read in full first.
  @Post('requests/:id/attachments')
  @Roles('REQUESTER', 'OFFICER')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Attach a fault image (JPEG, PNG or WebP, up to 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  upload(
    @Param('id') requestId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.attachments.upload(requestId, file, actor, ip);
  }

  @Delete('attachments/:id')
  @ApiOperation({ summary: 'Remove an image (its uploader, or an admin)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.attachments.remove(id, actor, ip);
  }
}
