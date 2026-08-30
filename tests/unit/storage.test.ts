/** @jest-environment jsdom */

import sharp from 'sharp';
import {
  extractKeyFromUrl,
  generateUniqueFilename,
  processImage,
  resolveStorageConfig,
  validateFileSize,
} from '@/lib/storage';

describe('secure image storage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('S3_') || key.startsWith('MINIO_')) delete process.env[key];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('rejects empty and oversized inputs', () => {
    expect(validateFileSize(0)).toBe(false);
    expect(validateFileSize(5 * 1024 * 1024)).toBe(true);
    expect(validateFileSize(5 * 1024 * 1024 + 1)).toBe(false);
  });

  test('uses a server-controlled webp filename', () => {
    expect(generateUniqueFilename()).toMatch(/^[a-z0-9]+-[0-9a-f-]+\.webp$/);
  });

  test('resolves legacy MinIO variables and derives a public bucket URL', () => {
    process.env.MINIO_ENDPOINT = 'http://minio:9000/';
    process.env.MINIO_ACCESS_KEY = 'legacy-access';
    process.env.MINIO_SECRET_KEY = 'legacy-secret';
    process.env.MINIO_BUCKET = 'legacy-bucket';

    expect(resolveStorageConfig()).toEqual({
      region: 'auto',
      endpoint: 'http://minio:9000',
      accessKeyId: 'legacy-access',
      secretAccessKey: 'legacy-secret',
      bucketName: 'legacy-bucket',
      publicUrl: 'http://minio:9000/legacy-bucket',
      forcePathStyle: true,
    });
  });

  test('prefers S3 variables over MinIO aliases', () => {
    process.env.S3_ENDPOINT = 'https://s3.example.com/';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_ACCESS_KEY_ID = 's3-access';
    process.env.S3_SECRET_ACCESS_KEY = 's3-secret';
    process.env.S3_BUCKET_NAME = 's3-bucket';
    process.env.S3_PUBLIC_URL = 'https://cdn.example.com/assets/';
    process.env.S3_FORCE_PATH_STYLE = 'false';
    process.env.MINIO_ENDPOINT = 'http://minio:9000';
    process.env.MINIO_ACCESS_KEY = 'minio-access';
    process.env.MINIO_SECRET_KEY = 'minio-secret';
    process.env.MINIO_BUCKET = 'minio-bucket';

    expect(resolveStorageConfig()).toEqual({
      region: 'us-east-1',
      endpoint: 'https://s3.example.com',
      accessKeyId: 's3-access',
      secretAccessKey: 's3-secret',
      bucketName: 's3-bucket',
      publicUrl: 'https://cdn.example.com/assets',
      forcePathStyle: false,
    });
  });

  test('rejects non-image content even if it could have an image filename', async () => {
    await expect(processImage(Buffer.from('<script>alert(1)</script>'))).rejects.toThrow();
  });

  test('decodes and re-encodes image bytes as metadata-free webp', async () => {
    const source = await sharp({
      create: { width: 4, height: 3, channels: 4, background: '#ff0000' },
    }).png().withMetadata({ orientation: 1 }).toBuffer();
    const result = await processImage(source);
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(4);
    expect(metadata.height).toBe(3);
    expect(metadata.exif).toBeUndefined();
  });

  test('only extracts keys from the configured public origin and upload prefix', () => {
    process.env.S3_PUBLIC_URL = 'https://cdn.example.com/qzblog';
    expect(extractKeyFromUrl('https://cdn.example.com/qzblog/uploads/2026/08/27/a.webp'))
      .toBe('uploads/2026/08/27/a.webp');
    expect(extractKeyFromUrl('https://evil.example/qzblog/uploads/a.webp')).toBeNull();
    expect(extractKeyFromUrl('https://cdn.example.com/qzblog/secrets/a')).toBeNull();
  });
});

