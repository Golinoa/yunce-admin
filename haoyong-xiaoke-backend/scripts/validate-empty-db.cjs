require('dotenv').config();

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const executeKey = String.fromCharCode(36) + 'executeRawUnsafe';
const disconnectKey = String.fromCharCode(36) + 'disconnect';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL missing');
  }

  const url = new URL(databaseUrl);
  const baseDbName = url.pathname.replace(/^\//, '') || 'xiaoke';
  const tempDbName = `${baseDbName}_empty_validate_${Date.now()}`;
  const adminClient = new PrismaClient();

  try {
    await adminClient[executeKey](`CREATE DATABASE \`${tempDbName}\``);

    const tempUrl = new URL(databaseUrl);
    tempUrl.pathname = `/${tempDbName}`;

    execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: tempUrl.toString() },
    });

    const validateClient = new PrismaClient({
      datasources: { db: { url: tempUrl.toString() } },
    });
    const profileCount = await validateClient.profile.count();
    await validateClient[disconnectKey]();

    console.log(JSON.stringify({ migrateDeploy: 'pass', profileCount }));
    await adminClient[executeKey](`DROP DATABASE \`${tempDbName}\``);
    await adminClient[disconnectKey]();
  } catch (error) {
    try {
      await adminClient[executeKey](`DROP DATABASE \`${tempDbName}\``);
    } catch (cleanupError) {
      console.error('TEMP_DB_DROP_FAILED');
      console.error(cleanupError.message);
    }

    await adminClient[disconnectKey]();
    throw error;
  }
}

main().catch((error) => {
  console.error('EMPTY_DB_VALIDATE_FAILED');
  console.error(error.message);
  process.exit(1);
});
