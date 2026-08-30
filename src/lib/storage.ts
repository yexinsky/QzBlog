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

export interface StorageConfig {
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName: string;
  publicUrl?: string;
  forcePathStyle: boolean;
}

function firstConfigured(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== '')?.trim();
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim().toLowerCase() !== 'false';
}

function normalizeEndpoint(value: string | undefined, env: NodeJS.ProcessEnv): string | undefined {
  const trimmed = value?.replace(/\/+$/, '');
  if (!trimmed) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const url = new URL(withScheme);
    // Legacy MINIO_PORT/S3_PORT support: endpoints often omit the port.
    const explicitPort = firstConfigured(env.S3_PORT, env.MINIO_PORT);
    if (!url.port && explicitPort && /^\d+$/.test(explicitPort.trim())) {
      url.port = explicitPort.trim();
    }
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${path}`;
  } catch {
    return withScheme;
  }
}

/**
 * Resolve both the current S3_* names and the older MINIO_* names. S3_* always wins
 * when both are present so migrations can be performed one variable at a time.
 */
export function resolveStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const endpoint = normalizeEndpoint(firstConfigured(env.S3_ENDPOINT, env.MINIO_ENDPOINT), env);
  const bucketName = firstConfigured(
    env.S3_BUCKET_NAME,
    env.S3_BUCKET,
    env.MINIO_BUCKET_NAME,
    env.MINIO_BUCKET
  ) || 'qzblog';
  const explicitPublicUrl = firstConfigured(env.S3_PUBLIC_URL, env.MINIO_PUBLIC_URL);
  const publicUrl = explicitPublicUrl
    ? explicitPublicUrl.replace(/\/+$/, '')
    : endpoint
      ? `${endpoint}/${encodeURIComponent(bucketName)}`
      : undefined;

  return {
    region: firstConfigured(env.S3_REGION, env.MINIO_REGION) || 'auto',
    endpoint,
    accessKeyId: firstConfigured(env.S3_ACCESS_KEY_ID, env.MINIO_ACCESS_KEY_ID, env.MINIO_ACCESS_KEY),
    secretAccessKey: firstConfigured(
      env.S3_SECRET_ACCESS_KEY,
      env.MINIO_SECRET_ACCESS_KEY,
      env.MINIO_SECRET_KEY
    ),
    bucketName,
    publicUrl,
    forcePathStyle: parseBoolean(
      firstConfigured(env.S3_FORCE_PATH_STYLE, env.MINIO_FORCE_PATH_STYLE),
      Boolean(endpoint)
    ),
  };
}

let clientCache: { signature: string; client: S3Client } | undefined;

function getStorageClient(config: StorageConfig): S3Client {
  const signature = JSON.stringify({
    region: config.region,
    endpoint: config.endpoint,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    forcePathStyle: config.forcePathStyle,
  });
  if (clientCache?.signature === signature) return clientCache.client;

  const hasAccessKey = Boolean(config.accessKeyId);
  const hasSecretKey = Boolean(config.secretAccessKey);
  if (hasAccessKey !== hasSecretKey) {
    throw new Error('Storage access key and secret key must be configured together');
  }

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: hasAccessKey
      ? { accessKeyId: config.accessKeyId!, secretAccessKey: config.secretAccessKey! }
      : undefined,
    forcePathStyle: config.forcePathStyle,
  });
  clientCache = { signature, client };
  return client;
}

export function validateFileSize(size: number, maxSize = MAX_FILE_SIZE): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= maxSize;
}

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

function publicUrlForKey(key: string, config = resolveStorageConfig()): string {
  if (!config.publicUrl) {
    throw new Error('S3_PUBLIC_URL or MINIO_PUBLIC_URL is required when no storage endpoint is configured');
  }
  return `${config.publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function processImage(buffer: Buffer): Promise<Buffer> {
  if (!validateFileSize(buffer.length)) {
    throw new Error(`Image must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const image = sharp(buffer, {
    failOn: 'warning',
    limitInputPixels: MAX_IMAGE_PIXELS,
    sequentialRead: true,
  });

  const metadata = await image.metadata();
  if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
    throw new Error('Unsupported or invalid image format');
  }
  if (!metadata.width || !metadata.height) throw new Error('Unable to determine image dimensions');
  if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
    throw new Error(`Image dimensions must not exceed ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}`);
  }
  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new Error(`Image must not exceed ${MAX_IMAGE_PIXELS.toLocaleString()} pixels`);
  }

  return image.rotate().webp({ quality: 82, effort: 4 }).toBuffer();
}

export async function uploadFile(
  buffer: Buffer,
  contentType = OUTPUT_CONTENT_TYPE
): Promise<{ url: string; key: string }> {
  const config = resolveStorageConfig();
  const filename = generateUniqueFilename(OUTPUT_FORMAT);
  const key = buildStoragePath(filename);

  await getStorageClient(config).send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    ContentDisposition: 'inline',
    Metadata: { processed: 'true' },
  }));

  return { url: publicUrlForKey(key, config), key };
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 86_400) {
    throw new Error('Presigned URL expiry must be between 1 and 86400 seconds');
  }
  const config = resolveStorageConfig();
  return getSignedUrl(
    getStorageClient(config),
    new GetObjectCommand({ Bucket: config.bucketName, Key: key }),
    { expiresIn }
  );
}

export async function checkFileExists(key: string): Promise<boolean> {
  const config = resolveStorageConfig();
  try {
    await getStorageClient(config).send(new HeadObjectCommand({ Bucket: config.bucketName, Key: key }));
    return true;
  } catch (error: unknown) {
    const storageError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (storageError.name === 'NotFound' || storageError.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

export async function deleteFile(key: string): Promise<void> {
  const config = resolveStorageConfig();
  await getStorageClient(config).send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
}

export function getPublicUrl(key: string): string {
  return publicUrlForKey(key);
}

export function extractKeyFromUrl(url: string): string | null {
  try {
    const publicBase = resolveStorageConfig().publicUrl;
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
      error: /S3_|MINIO_|storage|upload|bucket|access key|secret key/i.test(message)
        ? 'Failed to upload image'
        : message,
    };
  }
}

export const storageUtils = {
  resolveStorageConfig,
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
