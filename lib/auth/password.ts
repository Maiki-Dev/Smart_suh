import 'server-only';
import bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 10;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_PATTERN.test(value);
}

export async function hashPassword(plaintextPassword: string): Promise<string> {
  if (!plaintextPassword || plaintextPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  return bcrypt.hash(plaintextPassword, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(
  plaintextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  if (!plaintextPassword || !passwordHash) return false;
  if (!isBcryptHash(passwordHash)) return false;
  return bcrypt.compare(plaintextPassword, passwordHash);
}

/** Plain-text password_hash-ийг нэвтрэх үед bcrypt болгон шинэчилнэ. */
export async function verifyPasswordWithUpgrade(input: {
  plaintextPassword: string;
  passwordHash: string;
  upgrade?: (newHash: string) => Promise<void>;
}): Promise<boolean> {
  const { plaintextPassword, passwordHash, upgrade } = input;
  if (!plaintextPassword || !passwordHash) return false;

  if (isBcryptHash(passwordHash)) {
    return bcrypt.compare(plaintextPassword, passwordHash);
  }

  // Хуучин plain-text hash — зөв бол login үед автоматаар bcrypt болгоно
  if (plaintextPassword !== passwordHash) return false;

  if (upgrade) {
    const newHash = await hashPassword(plaintextPassword);
    await upgrade(newHash);
  }

  return true;
}
