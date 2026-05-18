import { AuthCryptoService } from './auth-crypto.service';

describe('AuthCryptoService', () => {
  it('hashes and verifies passwords without storing the raw password', async () => {
    const service = new AuthCryptoService();

    const hash = await service.hashPassword('correct horse battery staple');

    expect(hash).toContain('scrypt:');
    expect(hash).not.toContain('correct horse battery staple');
    await expect(service.verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(service.verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('hashes opaque tokens deterministically', () => {
    const service = new AuthCryptoService();

    expect(service.hashToken('token-value')).toBe(service.hashToken('token-value'));
    expect(service.hashToken('token-value')).not.toBe('token-value');
  });
});
