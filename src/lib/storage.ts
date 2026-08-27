import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 25_000_000;
const MAX_IMAGE_DIMENSION = 8_192;
const OUTPUT_FORMAT = 'webp';
const OUTPUT_CONTENT_TYPE = 'image/webp';
const UPLOAD_PATH_PREFIX = 'uploads';

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials:
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'qzblog';

export function validateFileSize(size: number, maxSize = MAX_FILE_SIZE): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= maxSize;
}

/**
 * Filenames are deliberately generated from a server-controlled extension.
 * The original filename and client MIME type are never trusted.
 */
export function generateUniqueFilename(extension = OUTPUT_FORMAT): string {
  const safeExtension = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || OUTPUT_FORMAT;
  return `${Date.now().toString(36)}-${uuidv4()}.${safeExtension}`;
}

export function buildStoragePath(filename: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${UPLOAD_PATH_PREFIX}/${year}/${month}/${day}/${filename}`;
}

function publicUrlForKey(key: string): string {
  const publicBase = process.env.S3_PUBLIC_URL?.replace(/\/+$/, '');
  if (!publicBase) {
    throw new Error('S3_PUBLIC_URL is required to return uploaded image URLs');
  }
  return `${publicBase}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function processImage(buffer: Buffer): Promise<Buffer> {
  if (!validateFileSize(buffer.length)) {
    throw new Error(`Image must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // sequentialRead and limitInputPixels protect the decoder from oversized/decompression-bomb images.
  const image = sharp(buffer, {
    failOn: 'warning',
    limitInputPixels: MAX_IMAGE_PIXELS,
    sequentialRead: true,
  });

  const metadata = await image.metadata();
  if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
    throw new Error('Unsupported or invalid image format');
  }
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to determine image dimensions');
  }
  if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
    throw new Error(`Image dimensions must not exceed ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}`);
  }
  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new Error(`Image must not exceed ${MAX_IMAGE_PIXELS.toLocaleString()} pixels`);
  }

  // Re-encoding strips active/polyglot payloads and metadata. Animated input is flattened to its first frame.
  return image
    .rotate()
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
}

export async function uploadFile(
  buffer: Buffer,
  contentType = OUTPUT_CONTENT_TYPE
): Promise<{ url: string; key: string }> {
  const filename = generateUniqueFilename(OUTPUT_FORMAT);
  const key = buildStoragePath(filename);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      ContentDisposition: 'inline',
      Metadata: { processed: 'true' },
      // Intentionally no public-read ACL. Configure read-only access at the CDN/bucket-policy layer.
    })
  );

  return { url: publicUrlForKey(key), key };
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 86_400) {
    throw new Error('Presigned URL expiry must be between 1 and 86400 seconds');
  }
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    { expiresIn }
  );
}

export async function checkFileExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch (error: unknown) {
    const storageError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (storageError.name === 'NotFound' || storageError.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
}

export function getPublicUrl(key: string): string {
  return publicUrlForKey(key);
}

export function extractKeyFromUrl(url: string): string | null {
  try {
    const publicBase = process.env.S3_PUBLIC_URL;
    if (!publicBase) return null;
    const candidate = new URL(url);
    const base = new URL(publicBase.endsWith('/') ? publicBase : `${publicBase}/`);
    if (candidate.origin !== base.origin || !candidate.pathname.startsWith(base.pathname)) return null;
    const key = decodeURIComponent(candidate.pathname.slice(base.pathname.length));
    return key.startsWith(`${UPLOAD_PATH_PREFIX}/`) && !key.includes('..') ? key : null;
  } catch {
    return null;
  }
}

export async function handleImageUpload(
  file: { buffer: Buffer; filename?: string; mimetype?: string },
  options: { maxSize?: number } = {}
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const maxSize = options.maxSize ?? MAX_FILE_SIZE;
  if (!validateFileSize(file.buffer.length, maxSize)) {
    return { success: false, error: `Image must be between 1 byte and ${maxSize / 1024 / 1024}MB` };
  }

  try {
    const safeImage = await processImage(file.buffer);
    const result = await uploadFile(safeImage, OUTPUT_CONTENT_TYPE);
    return { success: true, url: result.url };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid image';
    console.error('Image upload rejected:', message);
    return {
      success: false,
      error: /S3_|upload|bucket/i.test(message) ? 'Failed to upload image' : message,
    };
  }
}

export const storageUtils = {
  validateFileSize,
  generateUniqueFilename,
  buildStoragePath,
  processImage,
  uploadFile,
  getPresignedUrl,
  checkFileExists,
  deleteFile,
  getPublicUrl,
  extractKeyFromUrl,
  handleImageUpload,
};
