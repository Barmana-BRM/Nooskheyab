import argon2 from 'argon2';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../../src/auth/roles.guard';
import { maskMobile, maskNationalId, redactAuditMetadata } from '../../src/common/masking';
import { hashOpaqueToken, verifyOpaqueToken } from '../../src/common/token-hash';

const createContext = (role: string): ExecutionContext => {
  const request = { user: { role } };
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

describe('security primitives', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const password = 'a-strong-password-123';
    const hash = await argon2.hash(password, { type: argon2.argon2id });

    expect(await argon2.verify(hash, password)).toBe(true);
    expect(await argon2.verify(hash, 'a-different-password')).toBe(false);
  });

  it('hashes opaque tokens and compares them safely', () => {
    const token = 'opaque-token-value';
    const hash = hashOpaqueToken(token);

    expect(hash).not.toContain(token);
    expect(verifyOpaqueToken(token, hash)).toBe(true);
    expect(verifyOpaqueToken('wrong-token', hash)).toBe(false);
  });

  it('masks sensitive list values', () => {
    expect(maskMobile('09123456789')).toBe('0912***6789');
    expect(maskNationalId('0012446661')).toBe('001***6661');
  });

  it('redacts sensitive audit metadata recursively', () => {
    expect(
      redactAuditMetadata({
        publicId: 'RX-ABCDEFGH',
        nested: { nationalId: '0012446661', safe: true },
        items: [{ refreshToken: 'secret-token', action: 'LOGIN' }],
      }),
    ).toEqual({ publicId: 'RX-ABCDEFGH', nested: { safe: true }, items: [{ action: 'LOGIN' }] });
  });

  it('enforces role policy at the guard boundary', () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext('ADMIN'))).toBe(true);
    expect(() => guard.canActivate(createContext('PHARMACY_ADMIN'))).toThrow();
  });
});
