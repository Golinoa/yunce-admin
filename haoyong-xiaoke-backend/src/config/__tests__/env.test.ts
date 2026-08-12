import { jest } from '@jest/globals';

const ORIGINAL_ENV = { ...process.env };

describe('env config', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads and validates env lazily after module import', async () => {
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;

    const envModule = await import('../env');
    envModule.resetEnvCache();

    process.env.JWT_SECRET = 'test_jwt_secret_for_lazy_validation_only_32chars';
    process.env.DATABASE_URL = 'mysql://root:root123@localhost:3306/xiaoke_test';

    expect(envModule.getEnv().JWT_SECRET).toBe('test_jwt_secret_for_lazy_validation_only_32chars');
    expect(envModule.default.JWT_SECRET).toBe('test_jwt_secret_for_lazy_validation_only_32chars');
    expect(envModule.default.DATABASE_URL).toBe('mysql://root:root123@localhost:3306/xiaoke_test');
  });

  it('still throws when required env values are missing at access time', async () => {
    const envModule = await import('../env');
    envModule.resetEnvCache();

    process.env.JWT_SECRET = 'too-short';
    process.env.DATABASE_URL = '';

    expect(() => envModule.getEnv()).toThrow();
  });
});
