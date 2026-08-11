import 'server-only';
import bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 10;

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
  return bcrypt.compare(plaintextPassword, passwordHash);
}
