import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import type { ImageType } from '../image-type.js';
import { type StoredFile, StorageService } from './storage.service.js';

// Where local uploads are kept and the URL prefix they are served from (see app.setup.ts).
export const LOCAL_UPLOADS_DIR = resolve(process.cwd(), 'uploads');
export const LOCAL_UPLOADS_PREFIX = '/uploads/';

// Development-only storage, used when no Cloudinary credentials are set, so the
// upload feature can be built and tested without an account. Never used in
// production (the storage factory refuses to start without Cloudinary there).
export class LocalDiskStorage extends StorageService {
  async upload(buffer: Buffer, type: ImageType): Promise<StoredFile> {
    await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
    // We choose the file name ourselves. The sender's name is never used on disk,
    // which rules out tricks like "../../etc/passwd".
    const fileName = `${randomUUID()}.${type.extension}`;
    await writeFile(join(LOCAL_UPLOADS_DIR, fileName), buffer);
    return { url: `${LOCAL_UPLOADS_PREFIX}${fileName}`, publicId: fileName };
  }

  async remove(publicId: string): Promise<void> {
    try {
      await unlink(join(LOCAL_UPLOADS_DIR, basename(publicId)));
    } catch (error) {
      // Already gone is fine; anything else is a real problem.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
