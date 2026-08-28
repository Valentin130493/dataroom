import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('accepts the password it hashed', async () => {
    const stored = await service.hash('correct horse battery staple');

    await expect(service.verify(stored, 'correct horse battery staple')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await service.hash('password123');

    await expect(service.verify(stored, 'password124')).resolves.toBe(false);
  });

  it('keeps trailing spaces significant', async () => {
    const stored = await service.hash('password123');

    await expect(service.verify(stored, 'password123 ')).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    const first = await service.hash('password123');
    const second = await service.hash('password123');

    expect(first).not.toBe(second);
  });

  it('rejects a malformed record instead of throwing', async () => {
    await expect(service.verify('not-a-hash', 'password123')).resolves.toBe(false);
    await expect(service.verify('argon2$v=19$m=1', 'password123')).resolves.toBe(false);
  });
});
