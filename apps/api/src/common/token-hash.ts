import { createHash, timingSafeEqual } from 'node:crypto';

export const hashOpaqueToken = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const verifyOpaqueToken = (value: string, storedHash: string): boolean => {
  const provided = Buffer.from(hashOpaqueToken(value));
  const stored = Buffer.from(storedHash);
  return provided.length === stored.length && timingSafeEqual(provided, stored);
};
