import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number },
) => Promise<Buffer>;

// Node's own scrypt, so password storage needs no third-party dependency.
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

/** `scrypt$N$r$p$salt$key`, all hex — everything needed to verify later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('hex'), key.toString('hex')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, saltHex, keyHex] = parts;
  const expected = Buffer.from(keyHex, 'hex');
  if (expected.length === 0) return false;

  try {
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export interface CredentialProblem { field: 'username' | 'password'; message: string }

/** Usernames are the only identifier, so they stay short and unambiguous. */
export function checkCredentials(username: string, password: string): CredentialProblem | null {
  const name = username.trim();
  if (name.length < 3) return { field: 'username', message: 'Username needs at least 3 characters.' };
  if (name.length > 32) return { field: 'username', message: 'Username can be at most 32 characters.' };
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    return { field: 'username', message: 'Use letters, numbers, dots, dashes or underscores.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { field: 'password', message: `Password needs at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { field: 'password', message: 'That password is too long.' };
  }
  return null;
}

/** Case-insensitive lookup key, so "Ada" and "ada" are the same account. */
export function usernameKey(username: string): string {
  return username.trim().toLowerCase();
}
