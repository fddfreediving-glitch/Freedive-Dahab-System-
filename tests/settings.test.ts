import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { removeTemporaryDirectory } from './test-cleanup.js';

const originalDirectory = process.cwd();
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'freedive-settings-test-'));
process.chdir(temporaryDirectory);

const [{ db, initializeDatabase }, { seedInitialData }, { apiRouter }, expressModule] = await Promise.all([
  import('../server/db.js'),
  import('../server/seed.js'),
  import('../server/api.js'),
  import('express'),
]);

const express = expressModule.default;
let server: ReturnType<ReturnType<typeof express>['listen']>;
let baseUrl = '';
const crmToken = 'settings-crm-test-token';
const ownerToken = 'settings-owner-test-token';

before(async () => {
  initializeDatabase();
  seedInitialData();
  const insertSession = db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)');
  const createdAt = new Date().toISOString();
  insertSession.run(crmToken, 'usr_crm_01', Date.now() + 60_000, createdAt);
  insertSession.run(ownerToken, 'usr_owner_01', Date.now() + 60_000, createdAt);

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  process.chdir(originalDirectory);
  await removeTemporaryDirectory(temporaryDirectory);
});

async function request(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET',
  body?: unknown,
  requestToken = ownerToken,
): Promise<{ status: number; data: any }> {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${requestToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}

test('any authenticated user can read center settings with sensible defaults', async () => {
  const result = await request('/settings/center', 'GET', undefined, crmToken);
  assert.equal(result.status, 200);
  assert.equal(result.data.settings.center_name, 'Freedive Dahab');
  assert.equal(result.data.settings.address, 'Dahab, South Sinai, Egypt');
  assert.equal(result.data.settings.currency_default, 'EUR');
  assert.equal(result.data.settings.timezone, 'Africa/Cairo');
  assert.equal(result.data.settings.notify_deposit_reminders, 'true');
  assert.equal(result.data.settings.notify_daily_summary_email, 'false');

  const unauthenticated = await request('/settings/center', 'GET', undefined, 'not-a-real-token');
  assert.equal(unauthenticated.status, 401);
});

test('owner can update center settings and changes are persisted', async () => {
  const update = await request('/settings/center', 'PUT', {
    settings: {
      center_name: 'Freedive Dahab Pro',
      whatsapp: '+20 111 222 3344',
      notify_daily_summary_email: true,
    },
  });
  assert.equal(update.status, 200);

  const read = await request('/settings/center', 'GET', undefined, crmToken);
  assert.equal(read.data.settings.center_name, 'Freedive Dahab Pro');
  assert.equal(read.data.settings.whatsapp, '+20 111 222 3344');
  assert.equal(read.data.settings.notify_daily_summary_email, 'true');
  // Untouched keys keep their previous values
  assert.equal(read.data.settings.email, 'info@freedivedahab.com');
});

test('non-owner cannot update center settings', async () => {
  const denied = await request('/settings/center', 'PUT', {
    settings: { center_name: 'Hijacked Center' },
  }, crmToken);
  assert.equal(denied.status, 403);

  const read = await request('/settings/center', 'GET', undefined, crmToken);
  assert.notEqual(read.data.settings.center_name, 'Hijacked Center');
});

test('invalid center settings payloads are rejected', async () => {
  const cases: Array<[string, unknown]> = [
    ['settings-not-an-object', { settings: 'oops' }],
    ['empty-settings', { settings: {} }],
    ['unknown-key', { settings: { not_a_setting: 'x' } }],
    ['bad-email', { settings: { email: 'not-an-email' } }],
    ['bad-currency', { settings: { currency_default: 'JPY' } }],
    ['bad-timezone', { settings: { timezone: 'Mars/Olympus' } }],
    ['bad-boolean', { settings: { notify_low_stock_alerts: 'yes' } }],
    ['oversized-name', { settings: { center_name: 'x'.repeat(121) } }],
  ];

  for (const [label, payload] of cases) {
    const result = await request('/settings/center', 'PUT', payload);
    assert.equal(result.status, 400, `expected 400 for ${label}`);
    assert.ok(result.data.error, `expected an error message for ${label}`);
  }

  const validTimezone = await request('/settings/center', 'PUT', { settings: { timezone: 'Europe/Berlin' } });
  assert.equal(validTimezone.status, 200);
  await request('/settings/center', 'PUT', { settings: { timezone: 'Africa/Cairo' } });
});

test('backup endpoint returns JSON table dump and is owner-only', async () => {
  const denied = await request('/backup', 'GET', undefined, crmToken);
  assert.equal(denied.status, 403);

  const unauthenticated = await request('/backup', 'GET', undefined, 'not-a-real-token');
  assert.equal(unauthenticated.status, 401);

  const exported = await request('/backup');
  assert.equal(exported.status, 200);
  assert.equal(exported.data.exportVersion, '1.0.0');
  assert.ok(exported.data.exportedAt);
  assert.ok(Array.isArray(exported.data.data.users));
  assert.ok(Array.isArray(exported.data.data.students));
  assert.ok(Array.isArray(exported.data.data.invoices));
  assert.ok(Array.isArray(exported.data.data.center_settings));
  assert.equal(exported.data.data.users[0].password_hash, undefined);
  assert.equal(exported.data.data.users[0].salt, undefined);

  const legacyRoute = await request('/backup/export');
  assert.equal(legacyRoute.status, 200);
  assert.equal(legacyRoute.data.exportVersion, '1.0.0');
});
