import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { removeTemporaryDirectory } from './test-cleanup.js';

const originalDirectory = process.cwd();
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'freedive-pos-catalog-test-'));
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
const ownerToken = 'pos-catalog-owner-token';
const financeToken = 'pos-catalog-finance-token';
const frontDeskToken = 'pos-catalog-front-desk-token';
const instructorToken = 'pos-catalog-instructor-token';

before(async () => {
  initializeDatabase();
  seedInitialData();
  const insertSession = db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)');
  const createdAt = new Date().toISOString();
  insertSession.run(ownerToken, 'usr_owner_01', Date.now() + 60_000, createdAt);
  insertSession.run(financeToken, 'usr_fin_01', Date.now() + 60_000, createdAt);
  insertSession.run(frontDeskToken, 'usr_crm_01', Date.now() + 60_000, createdAt);
  insertSession.run(instructorToken, 'usr_inst_01', Date.now() + 60_000, createdAt);

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
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
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
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
  };
}

const catalogItem = {
  group: 'Activities',
  name: 'Test snorkel trip',
  category: 'activity',
  price: 42,
  price_currency: 'EUR',
  unit: 'person',
  description: 'A sample catalogue service',
  tier_minimum_quantity: null,
  tier_unit_price: null,
  stay_discount: false,
};

test('existing POS catalogue is seeded and readable by front desk', async () => {
  const result = await request('/pos/catalog', 'GET', undefined, frontDeskToken);
  assert.equal(result.status, 200);
  assert.ok(result.data.some((item: { id: string }) => item.id === 'ssi-freediver'));
  assert.ok(!result.data.some((item: { group: string }) => item.group === 'Gear rental'));
});

test('catalogue items can be added, edited, and archived without deleting history', async () => {
  const created = await request('/pos/catalog', 'POST', catalogItem, financeToken);
  assert.equal(created.status, 201);
  assert.equal(created.data.name, catalogItem.name);
  assert.equal(created.data.price, catalogItem.price);

  const updated = await request(`/pos/catalog/${created.data.id}`, 'PATCH', {
    ...catalogItem,
    name: 'Updated snorkel trip',
    price: 45,
    tier_minimum_quantity: 3,
    tier_unit_price: 40,
  }, financeToken);
  assert.equal(updated.status, 200);
  assert.equal(updated.data.name, 'Updated snorkel trip');
  assert.equal(updated.data.price, 45);
  assert.equal(updated.data.tier_minimum_quantity, 3);

  const archived = await request(`/pos/catalog/${created.data.id}`, 'DELETE', undefined, financeToken);
  assert.equal(archived.status, 200);
  const listed = await request('/pos/catalog');
  assert.ok(!listed.data.some((item: { id: string }) => item.id === created.data.id));
  const savedRecord = db.prepare('SELECT is_active FROM pos_catalog_items WHERE id = ?').get(created.data.id) as { is_active: number };
  assert.equal(savedRecord.is_active, 0);
});

test('catalogue rejects invalid prices and protects edits from non-finance roles', async () => {
  const unauthenticated = await request('/pos/catalog', 'GET', undefined, '');
  assert.equal(unauthenticated.status, 401);

  const invalid = await request('/pos/catalog', 'POST', { ...catalogItem, price: -1 });
  assert.equal(invalid.status, 400);

  const forbidden = await request('/pos/catalog', 'POST', catalogItem, instructorToken);
  assert.equal(forbidden.status, 403);

  const frontDeskWrite = await request('/pos/catalog', 'POST', catalogItem, frontDeskToken);
  assert.equal(frontDeskWrite.status, 403);
});
