/** @jest-environment jsdom */

import sharp from 'sharp';
import {
  extractKeyFromUrl,
  generateUniqueFilename,
  processImage,
  validateFileSize,
} from '@/lib/storage';

describe('secure image storage', () => {
  test('rejects empty and oversized inputs', () => {
    expect(validateFileSize(0)).toBe(false);
    expect(validateFileSize(5 * 1024 * 1024)).toBe(true);
    expect(validateFileSize(5 * 1024 * 1024 + 1)).toBe(false);
  });

  test('uses a server-controlled webp filename', () => {
    expect(generateUniqueFilename()).toMatch(/^[a-z0-9]+-[0-9a-f-]+\.webp$/);
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



