// Proves the Cloudinary settings work, using the same storage class the API uses:
// uploads a tiny test image, confirms it can be fetched, then deletes it.
//
//   1. Put CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
//      in apps/api/.env
//   2. npm run check:cloudinary -w api
//
// Nothing is left behind in your Cloudinary account, and no secret is printed.
import 'dotenv/config';
import { deflateSync } from 'node:zlib';
import { detectImageType } from '../src/attachments/image-type.js';
import { CloudinaryStorage } from '../src/attachments/storage/cloudinary.storage.js';

// A valid 32×32 grey PNG, built in memory.
function testPng(): Buffer {
  const size = 32;
  const raw = Buffer.alloc((size * 3 + 1) * size, 0x99);
  for (let y = 0; y < size; y += 1) raw[y * (size * 3 + 1)] = 0;
  const crc = (buffer: Buffer) => {
    let c = ~0;
    for (const byte of buffer) {
      c ^= byte;
      for (let bit = 0; bit < 8; bit += 1) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function main() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const missing = Object.entries({ CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret })
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(`Missing in apps/api/.env: ${missing.join(', ')}`);
  }

  const storage = new CloudinaryStorage({ cloudName, apiKey, apiSecret });
  const image = testPng();
  const type = detectImageType(image);
  if (!type) throw new Error('The test image was not recognised as an image');

  console.log('1. Uploading a test image…');
  const stored = await storage.upload(image, type);
  const host = new URL(stored.url).host;
  console.log(`   stored at https://${host}/… (id: ${stored.publicId})`);

  console.log('2. Fetching it back…');
  const fetched = await fetch(stored.url);
  if (!fetched.ok) throw new Error(`Uploaded image could not be fetched: HTTP ${fetched.status}`);
  console.log(`   HTTP ${fetched.status}, ${fetched.headers.get('content-type')}`);

  console.log('3. Deleting it…');
  await storage.remove(stored.publicId);
  // Cloudinary's CDN may cache the image briefly, so ask for it with a fresh address.
  const after = await fetch(`${stored.url}?check=${Date.now()}`, { cache: 'no-store' });
  console.log(
    after.ok
      ? '   delete request accepted (the CDN may serve a cached copy for a short while)'
      : `   gone (HTTP ${after.status})`,
  );

  console.log('\nCloudinary is working: upload, fetch and delete all succeeded.');
}

main().catch((error) => {
  console.error(`\nCloudinary check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
