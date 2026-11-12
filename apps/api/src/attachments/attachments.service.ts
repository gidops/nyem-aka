import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { basename } from 'node:path';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isClosed } from '../requests/request-status.machine.js';
import { RequestsService } from '../requests/requests.service.js';
import { detectImageType } from './image-type.js';
import { StorageService } from './storage/storage.service.js';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENTS_PER_UPLOADER = 5;

const attachmentSelect = {
  id: true,
  url: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async upload(
    requestId: string,
    file: Express.Multer.File | undefined,
    actor: AuthUser,
    ip?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Attach an image in a form field named "file"');
    }
    // Reuses the request visibility rules: the owner or the assigned officer only.
    const request = await this.requests.findScopedOrThrow(requestId, actor);
    if (isClosed(request.status)) {
      throw new BadRequestException(
        `Images cannot be added to a request that is ${request.status}`,
      );
    }

    const type = detectImageType(file.buffer);
    if (!type) {
      throw new BadRequestException('Only JPEG, PNG or WebP images are accepted');
    }

    const existing = await this.prisma.attachment.count({
      where: { requestId, uploadedById: actor.id },
    });
    if (existing >= MAX_ATTACHMENTS_PER_UPLOADER) {
      throw new BadRequestException(
        `You can add at most ${MAX_ATTACHMENTS_PER_UPLOADER} images to a request`,
      );
    }

    const stored = await this.storage.upload(file.buffer, type);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const attachment = await tx.attachment.create({
          data: {
            requestId,
            uploadedById: actor.id,
            url: stored.url,
            publicId: stored.publicId,
            // Kept for display only. basename() strips any folder parts a client sent.
            fileName: basename(file.originalname).slice(0, 200),
            mimeType: type.mimeType, // what the file IS, not what the sender claimed
            sizeBytes: file.size,
          },
          select: attachmentSelect,
        });
        await this.audit.log(
          {
            action: 'attachment.added',
            entity: 'ServiceRequest',
            entityId: requestId,
            actorId: actor.id,
            metadata: { attachmentId: attachment.id, sizeBytes: file.size },
            ip,
          },
          tx,
        );
        return attachment;
      });
    } catch (error) {
      // The file was stored but the database row was not: remove the orphan.
      await this.removeFromStorage(stored.publicId);
      throw error;
    }
  }

  async remove(id: string, actor: AuthUser, ip?: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      select: { id: true, publicId: true, requestId: true, uploadedById: true },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    if (actor.role !== 'ADMIN') {
      // First: can you see the request at all? (404 if not.)
      await this.requests.findScopedOrThrow(attachment.requestId, actor);
      // Then: is it your upload? You may not delete someone else's evidence.
      if (attachment.uploadedById !== actor.id) {
        throw new ForbiddenException('You can only remove images you uploaded');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.attachment.delete({ where: { id } });
      await this.audit.log(
        {
          action: 'attachment.removed',
          entity: 'ServiceRequest',
          entityId: attachment.requestId,
          actorId: actor.id,
          metadata: { attachmentId: id },
          ip,
        },
        tx,
      );
    });
    // Database first, storage second: if the storage call fails we are left with an
    // unused file (harmless) rather than a row pointing at a missing image (broken).
    await this.removeFromStorage(attachment.publicId);
    return { success: true };
  }

  private async removeFromStorage(publicId: string) {
    try {
      await this.storage.remove(publicId);
    } catch (error) {
      this.logger.warn(`Could not remove stored file ${publicId}: ${String(error)}`);
    }
  }
}
