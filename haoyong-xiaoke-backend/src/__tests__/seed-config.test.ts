import fs from 'fs';
import path from 'path';

describe('REV-01 seed and startup configuration', () => {
  const rootDir = process.cwd();

  it('docker compose should not auto-run prisma db seed', () => {
    const dockerCompose = fs.readFileSync(path.join(rootDir, 'docker-compose.yml'), 'utf8');
    expect(dockerCompose).not.toContain('prisma db seed');
  });

  it('repository should ignore all env files except .env.example', () => {
    const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');

    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.*');
    expect(gitignore).toContain('!.env.example');
  });

  it('tracked sample configs should use explicit local placeholder secrets', () => {
    const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
    const dockerCompose = fs.readFileSync(path.join(rootDir, 'docker-compose.yml'), 'utf8');

    expect(envExample).toContain('change_me_local_db_password');
    expect(envExample).toContain('change_me_local_jwt_secret_min_32_chars');
    expect(envExample).not.toContain('xiaoke_dev');

    expect(dockerCompose).toContain('change_me_local_db_password');
    expect(dockerCompose).toContain('change_me_local_root_password');
    expect(dockerCompose).toContain('change_me_local_jwt_secret_min_32_chars');
    expect(dockerCompose).not.toContain('root123456');
    expect(dockerCompose).not.toContain('dev_jwt_secret_for_local_development_only_32chars');
  });

  it('ci should validate empty database deployment with mysql service', () => {
    const ciWorkflow = fs.readFileSync(
      path.join(rootDir, '.github', 'workflows', 'ci.yml'),
      'utf8',
    );

    expect(ciWorkflow).toContain('mysql:8.4');
    expect(ciWorkflow).toContain('Validate Empty Database Deploy');
    expect(ciWorkflow).toContain('npm run db:validate-empty');
  });

  it('package scripts should keep explicit dev reset seed command', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
      prisma?: { seed?: string };
    };

    expect(packageJson.scripts?.['db:seed']).toBe('ts-node prisma/seed.ts');
    expect(packageJson.scripts?.['db:seed:dev-reset']).toBe('ts-node prisma/seed.dev-reset.ts');
    expect(packageJson.prisma?.seed).toBe('ts-node prisma/seed.ts');
  });

  it('safe seed should not contain destructive deleteMany calls', () => {
    const safeSeed = fs.readFileSync(path.join(rootDir, 'prisma', 'seed.ts'), 'utf8');
    const resetSeed = fs.readFileSync(path.join(rootDir, 'prisma', 'seed.dev-reset.ts'), 'utf8');

    expect(safeSeed).not.toContain('deleteMany');
    expect(resetSeed).toContain('deleteMany');
  });

  it('leave request owner fields should be added by an incremental migration', () => {
    const initMigration = fs.readFileSync(
      path.join(rootDir, 'prisma', 'migrations', '20260608175720_init_mysql', 'migration.sql'),
      'utf8',
    );
    const incrementalMigration = fs.readFileSync(
      path.join(rootDir, 'prisma', 'migrations', '20260622_add_leave_request_owner_fields', 'migration.sql'),
      'utf8',
    );
    const leaveRequestCreateTable = initMigration.match(
      /CREATE TABLE `LeaveRequest` \(([\s\S]*?)\) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;/,
    )?.[1] ?? '';

    expect(leaveRequestCreateTable).not.toContain('`parentId`');
    expect(leaveRequestCreateTable).not.toContain('`teacherId`');
    expect(incrementalMigration).toContain('ADD COLUMN `parentId`');
    expect(incrementalMigration).toContain('ADD COLUMN `teacherId`');
  });

  it('utf8mb4 default icons should be corrected by an incremental migration', () => {
    const iconDefaultFixMigration = fs.readFileSync(
      path.join(rootDir, 'prisma', 'migrations', '20260623_fix_utf8mb4_default_icons', 'migration.sql'),
      'utf8',
    );

    expect(iconDefaultFixMigration).toContain("ALTER TABLE `Campus`");
    expect(iconDefaultFixMigration).toContain("DEFAULT '🏫'");
    expect(iconDefaultFixMigration).toContain("ALTER TABLE `Subject`");
    expect(iconDefaultFixMigration).toContain("DEFAULT '📚'");
    expect(iconDefaultFixMigration).toContain("ALTER TABLE `Holiday`");
    expect(iconDefaultFixMigration).toContain("DEFAULT '🎉'");
  });

  it('dev reset seed should only run in development environment', () => {
    const resetSeed = fs.readFileSync(path.join(rootDir, 'prisma', 'seed.dev-reset.ts'), 'utf8');

    expect(resetSeed).toContain("import 'dotenv/config'");
    expect(resetSeed).toContain("process.env.NODE_ENV !== 'development'");
  });
});
