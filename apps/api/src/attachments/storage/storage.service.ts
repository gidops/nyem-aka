import type { ImageType } from '../image-type.js';

export interface StoredFile {
  url: string; // where the image can be viewed
  publicId: string; // what the storage needs in order to delete it later
}

// The rest of the app depends on this description of "somewhere to keep files",
// not on Cloudinary itself. Swapping the provider (or using the local disk in
// development) then touches one file instead of every caller.
export abstract class StorageService {
  abstract upload(buffer: Buffer, type: ImageType): Promise<StoredFile>;
  abstract remove(publicId: string): Promise<void>;
}
