import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

const originalDirectory = process.cwd();
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'freedive-student-registration-test-'));
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
const ownerToken = 'student-registration-owner-token';
const frontDeskToken = 'student-registration-front-desk-token';

before(async () => {
  initializeDatabase();
  seedInitialData();
  const insertSession = db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)');
  const createdAt = new Date().toISOString();
  insertSession.run(ownerToken, 'usr_owner_01', Date.now() + 60_000, createdAt);
  insertSession.run(frontDeskToken, 'usr_crm_01', Date.now() + 60_000, createdAt);

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
  for (let attempt = 0; ; attempt += 1) {
    try {
      rmSync(temporaryDirectory, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt >= 4 || !(error instanceof Error && 'code' in error && ['EPERM', 'EACCES', 'EBUSY'].includes(String(error.code)))) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
});

async function request(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
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

test('student registration preserves lead status and the full contact and freediving profile', async () => {
  const payload = {
    first_name: 'Nadia',
    last_name: 'Example',
    email: 'nadia.registration@example.test',
    phone: '+20 100 000 0000',
    nationality: 'Egyptian',
    date_of_birth: '1995-06-12',
    certification_agency: 'AIDA',
    certification_level: 'Wave 2',
    total_depth_pb: 32.5,
    static_apnea_pb: '04:15',
    medical_waiver_signed: true,
    medical_waiver_date: new Date().toISOString().slice(0, 10),
    medical_clearance_status: 'physician_approved',
    medical_notes: 'Approved by physician',
    emergency_contact_name: 'Omar Example',
    emergency_contact_phone: '+20 100 000 0001',
    insurance_details: 'Travel policy',
    source_channel: 'Website',
    status: 'lead',
    notes: 'Interested in the next beginner course',
  };
  const created = await request('/students', 'POST', payload);
  assert.equal(created.status, 201);

  const saved = db.prepare('SELECT * FROM students WHERE id = ?').get(created.data.id) as Record<string, unknown>;
  assert.equal(saved.status, 'lead');
  assert.equal(saved.nationality, payload.nationality);
  assert.equal(saved.date_of_birth, payload.date_of_birth);
  assert.equal(saved.certification_level, payload.certification_level);
  assert.equal(saved.total_depth_pb, payload.total_depth_pb);
  assert.equal(saved.static_apnea_pb, payload.static_apnea_pb);
  assert.equal(saved.medical_clearance_status, payload.medical_clearance_status);
  assert.equal(saved.emergency_contact_name, payload.emergency_contact_name);
  assert.equal(saved.insurance_details, payload.insurance_details);
  assert.equal(saved.source_channel, payload.source_channel);
  assert.equal(saved.notes, payload.notes);
});

test('front desk registration cannot set restricted medical clearance or notes', async () => {
  const forbidden = await request('/students', 'POST', {
    first_name: 'Front',
    last_name: 'Desk',
    email: 'frontdesk.registration@example.test',
    medical_clearance_status: 'cleared',
  }, frontDeskToken);
  assert.equal(forbidden.status, 403);
  assert.equal(db.prepare('SELECT id FROM students WHERE email = ?').get('frontdesk.registration@example.test'), undefined);

  const invalid = await request('/students', 'POST', {
    first_name: 'Invalid',
    last_name: 'Status',
    email: 'invalid.registration@example.test',
    status: 'not-a-student-status',
  }, ownerToken);
  assert.equal(invalid.status, 400);
});
