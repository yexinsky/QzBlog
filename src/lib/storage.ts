import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// S3客户端配置
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // MinIO需要这个选项
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'qzblog';
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_PATH_PREFIX = 'uploads';

/**
 * 验证文件扩展名
 */
export function validateFileExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * 验证文件大小
 */
export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * 生成唯一文件名
 */
export function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const uuid = uuidv4();
  const timestamp = Date.now().toString(36);
  return `${timestamp}-${uuid}${ext}`;
}

/**
 * 构建存储路径（按日期分片）
 */
export function buildStoragePath(filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${UPLOAD_PATH_PREFIX}/${year}/${month}/${day}/${filename}`;
}

/**
 * 上传文件到S3
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const uniqueFilename = generateUniqueFilename(filename);
  const key = buildStoragePath(uniqueFilename);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    })
  );

  const url = `${process.env.S3_PUBLIC_URL}/${key}`;
  return { url, key };
}

/**
 * 获取文件预签名URL（用于私有文件访问）
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * 检查文件是否存在
 */
export async function checkFileExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * 删除文件
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * 获取文件公开URL
 */
export function getPublicUrl(key: string): string {
  return `${process.env.S3_PUBLIC_URL}/${key}`;
}

/**
 * 从URL中提取key
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // 移除开头的 /
    return urlObj.pathname.slice(1);
  } catch {
    return null;
  }
}

/**
 * 处理图片上传的主函数
 */
export async function handleImageUpload(
  file: { buffer: Buffer; filename: string; mimetype: string },
  options: { maxSize?: number } = {}
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const { maxSize = MAX_FILE_SIZE } = options;

  // 验证文件大小
  if (!validateFileSize(file.buffer.length)) {
    return {
      success: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }

  // 验证文件扩展名
  if (!validateFileExtension(file.filename)) {
    return {
      success: false,
      error: `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // 禁止SVG（XSS风险）
  const ext = path.extname(file.filename).toLowerCase().slice(1);
  if (ext === 'svg') {
    return {
      success: false,
      error: 'SVG files are not allowed due to security concerns',
    };
  }

  try {
    const result = await uploadFile(file.buffer, file.filename, file.mimetype);
    return {
      success: true,
      url: result.url,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Failed to upload file',
    };
  }
}

export default {
  uploadFile,
  getPresignedUrl,
  checkFileExists,
  deleteFile,
  getPublicUrl,
  extractKeyFromUrl,
  handleImageUpload,
  validateFileExtension,
  validateFileSize,
  generateUniqueFilename,
  buildStoragePath,
};