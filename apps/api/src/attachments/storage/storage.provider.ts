import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryStorage } from './cloudinary.storage.js';
import { LocalDiskStorage } from './local-disk.storage.js';
import { StorageService } from './storage.service.js';

// Decides, once at startup, which storage the app uses.
export const storageProvider: Provider = {
  provide: StorageService,
  inject: [ConfigService],
  useFactory: (config: ConfigService): StorageService => {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      return new CloudinaryStorage({ cloudName, apiKey, apiSecret });
    }
    if (config.get<string>('NODE_ENV') === 'production') {
      // Fail at boot, loudly, rather than lose users' images on the next deploy.
      throw new Error(
        'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required in production',
      );
    }
    new Logger('Storage').warn(
      'Cloudinary is not configured: uploads are saved to apps/api/uploads (development only)',
    );
    return new LocalDiskStorage();
  },
};
