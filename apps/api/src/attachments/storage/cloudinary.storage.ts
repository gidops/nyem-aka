import cloudinaryPackage from 'cloudinary';
import type { ImageType } from '../image-type.js';
import { type StoredFile, StorageService } from './storage.service.js';

const cloudinary = cloudinaryPackage.v2;

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

// Production storage. Render's disk is wiped on every deploy, so files must live
// with an external service.
export class CloudinaryStorage extends StorageService {
  constructor(credentials: CloudinaryCredentials) {
    super();
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  }

  upload(buffer: Buffer, _type: ImageType): Promise<StoredFile> {
    // The file is streamed from memory straight to Cloudinary; it never touches our disk.
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'nyem-aka/requests', resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            reject(new Error(error?.message ?? 'Cloudinary upload failed'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }

  async remove(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }
}
