import { encryptSecret, decryptSecret, isEncryptedSecret, maskSecret } from '@/lib/crypto';

describe('secret encryption (settings 页敏感字段)', () => {
  test('encrypts and decrypts round-trip', () => {
    const plaintext = 'smtp-auth-code-123456';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  test('produces different ciphertexts for the same input', () => {
    const a = encryptSecret('same-value');
    const b = encryptSecret('same-value');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('same-value');
    expect(decryptSecret(b)).toBe('same-value');
  });

  test('returns null for malformed or tampered input', () => {
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret('')).toBeNull();
    expect(decryptSecret('plaintext')).toBeNull();
    expect(decryptSecret('enc:v1:bad:bad:bad')).toBeNull();
  });

  test('isEncryptedSecret detects only encrypted payloads', () => {
    expect(isEncryptedSecret(encryptSecret('x'))).toBe(true);
    expect(isEncryptedSecret('raw-password')).toBe(false);
    expect(isEncryptedSecret(null)).toBe(false);
  });

  test('maskSecret only reveals trailing characters', () => {
    expect(maskSecret('abcdefgh')).toBe('••••••gh');
    expect(maskSecret('ab')).toBe('••••••');
    expect(maskSecret(null)).toBeNull();
  });
});
