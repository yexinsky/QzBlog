import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * 设置页敏感字段（SMTP 授权码、飞书签名密钥）的静态加密（PRD 11.8/11.9）。
 * 密钥从 AUTH_TOKEN_SECRET / NEXTAUTH_SECRET 派生（SHA-256），数据库中仅存
 * `enc:v1:<iv>:<tag>:<ciphertext>` 形式的密文，界面不明文回显。
 */

const ENCRYPTION_KEY = createHash('sha256')
  .update(process.env.AUTH_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || 'qzblog-dev-secret')
  .digest();

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const parts = stored.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') return null;
  try {
    const iv = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');
    const ciphertext = Buffer.from(parts[4], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** 判断字段是否已加密存储 */
export function isEncryptedSecret(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith('enc:v1:'));
}

/** 界面回显掩码：仅展示末 2 位 */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 2) return '••••••';
  return `••••••${value.slice(-2)}`;
}
