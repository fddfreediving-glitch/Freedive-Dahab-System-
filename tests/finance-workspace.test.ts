import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

const originalDirectory = process.cwd();
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'freedive-finance-workspace-test-'));
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
const ownerToken = 'finance-workspace-owner-token';
const financeToken = 'finance-workspace-finance-token';
const instructorToken = 'finance-workspace-instructor-token';

before(async () => {
  initializeDatabase();
  seedInitialData();
  const insertSession = db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)');
  const createdAt = new Date().toISOString();
  insertSession.run(ownerToken, 'usr_owner_01', Date.now() + 60_000, createdAt);
  insertSession.run(financeToken, 'usr_fin_01', Date.now() + 60_000, createdAt);
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
  for (let attempt = 0; ; attempt += 1) {
    try {
      rmSync(temporaryDirectory, { recursive: true, force: true });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM' || attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
});

async function request(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' = 'GET',
  body?: unknown,
  requestToken = financeToken,
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

test('opening cash balances are saved by currency and used for current cash positions', async () => {
  const saved = await request('/finance/cash-balances', 'PATCH', {
    opening_balances: { EUR: 100.25, USD: 200, EGP: 3000.75, GBP: 40.5 },
  }, ownerToken);
  assert.equal(saved.status, 200);

  const loaded = await request('/finance/cash-balances');
  assert.equal(loaded.status, 200);
  assert.deepEqual(loaded.data.opening_balances, { EUR: 100.25, USD: 200, EGP: 3000.75, GBP: 40.5 });
  assert.deepEqual(loaded.data.current_balances, {
    EUR: Math.round((100.25 + loaded.data.income_by_currency.EUR - loaded.data.expenses_by_currency.EUR) * 100) / 100,
    USD: Math.round((200 + loaded.data.income_by_currency.USD - loaded.data.expenses_by_currency.USD) * 100) / 100,
    EGP: Math.round((3000.75 + loaded.data.income_by_currency.EGP - loaded.data.expenses_by_currency.EGP) * 100) / 100,
    GBP: Math.round((40.5 + loaded.data.income_by_currency.GBP - loaded.data.expenses_by_currency.GBP) * 100) / 100,
  });
});

test('current cash positions track payment and expense changes independently in EUR, USD, and EGP', async () => {
  const initial = await request('/finance/cash-balances');
  const student = db.prepare('SELECT id FROM students LIMIT 1').get() as { id: string };
  const now = new Date().toISOString();
  const changes = [
    { currency: 'EUR', payment: 25.5, expense: 5.25 },
    { currency: 'USD', payment: 40, expense: 7.5 },
    { currency: 'EGP', payment: 500, expense: 50 },
  ];

  for (const change of changes) {
    const invoiceId = `inv_cash_${change.currency.toLowerCase()}`;
    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, student_id, issue_date, due_date, currency, subtotal,
        tax_rate, tax_amount, total_amount, paid_amount, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1000, 0, 0, 1000, ?, 'partially_paid', ?, ?)
    `).run(
      invoiceId,
      `INV-CASH-${change.currency}`,
      student.id,
      now.slice(0, 10),
      now.slice(0, 10),
      change.currency,
      change.payment,
      now,
      now,
    );
    db.prepare(`
      INSERT INTO payments (id, invoice_id, amount, currency, payment_method, payment_date, recorded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `pmt_cash_${change.currency.toLowerCase()}`,
      invoiceId,
      change.payment,
      change.currency,
      `Cash ${change.currency}`,
      now.slice(0, 10),
      'usr_fin_01',
      now,
    );
    db.prepare(`
      INSERT INTO expenses (
        id, expense_number, category, vendor_name, amount, currency, expense_date,
        status, description, created_by, created_at
      ) VALUES (?, ?, 'Test', 'Test vendor', ?, ?, ?, 'approved', 'Finance dashboard test', 'usr_fin_01', ?)
    `).run(
      `exp_cash_${change.currency.toLowerCase()}`,
      `EXP-CASH-${change.currency}`,
      change.expense,
      change.currency,
      now.slice(0, 10),
      now,
    );
  }

  const updated = await request('/finance/cash-balances');
  assert.equal(updated.status, 200);
  for (const change of changes) {
    assert.equal(
      Math.round((updated.data.current_balances[change.currency] - initial.data.current_balances[change.currency]) * 100) / 100,
      Math.round((change.payment - change.expense) * 100) / 100,
    );
  }
});

test('opening balances reject invalid values and remain restricted to finance roles', async () => {
  const invalid = await request('/finance/cash-balances', 'PATCH', {
    opening_balances: { EUR: 1, USD: -1, EGP: 3 },
  });
  assert.equal(invalid.status, 400);

  const unauthorized = await request('/finance/cash-balances', 'PATCH', {
    opening_balances: { EUR: 1, USD: 2, EGP: 3, GBP: 4 },
  }, instructorToken);
  assert.equal(unauthorized.status, 403);
});

test('invoice edits persist service details and totals without rewriting payments', async () => {
  const student = db.prepare('SELECT id FROM students LIMIT 1').get() as { id: string };
  const now = new Date().toISOString();
  const invoiceId = 'inv_finance_edit_test';
  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, student_id, issue_date, due_date, currency, subtotal,
      tax_rate, tax_amount, total_amount, paid_amount, status, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'EUR', 100, 0, 0, 100, 30, 'partially_paid', 'Original note', 'usr_fin_01', ?, ?)
  `).run(invoiceId, 'INV-FINANCE-EDIT-TEST', student.id, now.slice(0, 10), now.slice(0, 10), now, now);
  db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, category, description, quantity, unit_price, total_price)
    VALUES ('item_finance_edit_test', ?, 'course', 'Freediver course', 1, 100, 100)
  `).run(invoiceId);
  db.prepare(`
    INSERT INTO payments (id, invoice_id, amount, currency, payment_method, payment_date, recorded_by, created_at)
    VALUES ('pmt_finance_edit_test', ?, 30, 'EUR', 'Cash EUR', ?, 'usr_fin_01', ?)
  `).run(invoiceId, now.slice(0, 10), now);

  const saved = await request(`/finance/invoices/${invoiceId}`, 'PATCH', {
    issue_date: now.slice(0, 10),
    due_date: now.slice(0, 10),
    tax_rate: 10,
    notes: 'Updated service details',
    items: [{
      category: 'accommodation',
      description: 'Lighthouse Room',
      quantity: 2,
      unit_price: 60,
      check_in_date: '2030-10-10',
      check_out_date: '2030-10-12',
    }],
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.total_amount, 132);

  const invoice = db.prepare('SELECT total_amount, paid_amount, status, notes FROM invoices WHERE id = ?').get(invoiceId) as {
    total_amount: number;
    paid_amount: number;
    status: string;
    notes: string;
  };
  const items = db.prepare('SELECT category, description, quantity, unit_price, total_price, check_in_date, check_out_date FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
  const paymentCount = (db.prepare('SELECT COUNT(*) AS count FROM payments WHERE invoice_id = ?').get(invoiceId) as { count: number }).count;
  assert.deepEqual(invoice, { total_amount: 132, paid_amount: 30, status: 'partially_paid', notes: 'Updated service details' });
  assert.deepEqual(items, [{
    category: 'accommodation',
    description: 'Lighthouse Room',
    quantity: 2,
    unit_price: 60,
    total_price: 120,
    check_in_date: '2030-10-10',
    check_out_date: '2030-10-12',
  }]);
  assert.equal(paymentCount, 1);
});

test('direct invoices require accommodation dates and persist the stay', async () => {
  const student = db.prepare('SELECT id FROM students LIMIT 1').get() as { id: string };
  const missingDates = await request('/finance/invoices', 'POST', {
    student_id: student.id,
    currency: 'EUR',
    items: [{ category: 'accommodation', description: 'Islands Room', quantity: 2, unit_price: 30 }],
  });
  assert.equal(missingDates.status, 400);

  const created = await request('/finance/invoices', 'POST', {
    student_id: student.id,
    currency: 'EUR',
    items: [{
      category: 'accommodation',
      description: 'Islands Room',
      quantity: 2,
      unit_price: 30,
      check_in_date: '2030-11-03',
      check_out_date: '2030-11-05',
    }],
  });
  assert.equal(created.status, 201);
  const stay = db.prepare('SELECT check_in_date, check_out_date FROM invoice_items WHERE invoice_id = ?').get(created.data.id);
  assert.deepEqual(stay, { check_in_date: '2030-11-03', check_out_date: '2030-11-05' });
});

test('invoice edits reject invalid services and totals below payments already received', async () => {
  const tooSmall = await request('/finance/invoices/inv_finance_edit_test', 'PATCH', {
    issue_date: '2026-01-01',
    due_date: '2026-01-01',
    tax_rate: 0,
    notes: '',
    items: [{ category: 'course', description: 'Small service', quantity: 1, unit_price: 20 }],
  });
  assert.equal(tooSmall.status, 409);

  const invalidCategory = await request('/finance/invoices/inv_finance_edit_test', 'PATCH', {
    issue_date: '2026-01-01',
    due_date: '2026-01-01',
    tax_rate: 0,
    notes: '',
    items: [{ category: 'unlisted', description: 'Service', quantity: 1, unit_price: 50 }],
  });
  assert.equal(invalidCategory.status, 400);
});

test('invoice payments reject empty allocations, auto-allocate omitted allocations, and append refunds', async () => {
  const student = db.prepare('SELECT id FROM students LIMIT 1').get() as { id: string };
  const now = new Date().toISOString();
  const invoiceId = 'inv_finance_allocation_test';
  const itemId = 'item_finance_allocation_test';
  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, student_id, issue_date, due_date, currency, subtotal,
      tax_rate, tax_amount, total_amount, paid_amount, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'GBP', 100, 0, 0, 100, 0, 'issued', ?, ?)
  `).run(invoiceId, 'INV-FINANCE-ALLOCATION-TEST', student.id, now.slice(0, 10), now.slice(0, 10), now, now);
  db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, category, description, quantity, unit_price, total_price)
    VALUES (?, ?, 'course', 'SSI Freediver course', 1, 100, 100)
  `).run(itemId, invoiceId);

  const incomplete = await request(`/finance/invoices/${invoiceId}/payments`, 'POST', {
    amount: 50,
    customer_id: student.id,
    payment_method: 'Cash GBP',
    payment_account: 'Cash GBP',
    payment_date: now.slice(0, 10),
    allocations: [],
  });
  assert.equal(incomplete.status, 400);

  const recorded = await request(`/finance/invoices/${invoiceId}/payments`, 'POST', {
    amount: 50,
    customer_id: student.id,
    payment_method: 'Cash GBP',
    payment_account: 'Cash GBP',
    payment_date: now.slice(0, 10),
    reference_number: 'RECEIPT-50',
    notes: 'Course installment',
  });
  assert.equal(recorded.status, 201);
  const paymentId = recorded.data.paymentId as string;
  const allocation = db.prepare('SELECT id FROM payment_allocations WHERE payment_id = ?').get(paymentId) as { id: string };
  assert.equal(
    (db.prepare('SELECT SUM(amount_cents) AS total FROM payment_allocations WHERE payment_id = ?').get(paymentId) as { total: number }).total,
    5000,
  );

  const unauthorized = await request(`/finance/payments/${paymentId}/adjustments`, 'POST', {
    adjustment_type: 'refund',
    direction: 'debit',
    amount: 10,
    adjustment_date: now.slice(0, 10),
    payment_method: 'Cash GBP',
    payment_account: 'Cash GBP',
    reason: 'Duplicate refund attempt',
    allocations: [{ payment_allocation_id: allocation.id, amount: 10 }],
  }, instructorToken);
  assert.equal(unauthorized.status, 403);

  const refunded = await request(`/finance/payments/${paymentId}/adjustments`, 'POST', {
    adjustment_type: 'refund',
    direction: 'debit',
    amount: 20,
    adjustment_date: now.slice(0, 10),
    payment_method: 'Cash GBP',
    payment_account: 'Cash GBP',
    reason: 'Customer schedule change',
    reference_number: 'REF-20',
    allocations: [{ payment_allocation_id: allocation.id, amount: 20 }],
  });
  assert.equal(refunded.status, 201);
  const invoice = db.prepare('SELECT paid_amount, status FROM invoices WHERE id = ?').get(invoiceId) as { paid_amount: number; status: string };
  assert.deepEqual(invoice, { paid_amount: 30, status: 'partially_paid' });

  const listed = await request('/finance/invoices');
  const savedInvoice = listed.data.find((entry: any) => entry.id === invoiceId);
  assert.equal(savedInvoice.payments[0].net_amount, 30);
  assert.equal(savedInvoice.payments[0].allocations[0].service_label, 'SSI Freediver course');
  assert.equal(savedInvoice.payments[0].adjustments[0].reason, 'Customer schedule change');
  assert.equal(savedInvoice.items[0].paid_amount, 30);
  assert.equal(savedInvoice.items[0].remaining_amount, 70);
  assert.equal(typeof savedInvoice.payments[0].recorded_by_name, 'string');
  assert.ok(savedInvoice.payments[0].recorded_by_name.length > 0);

  const edited = await request(`/finance/invoices/${invoiceId}`, 'PATCH', {
    issue_date: now.slice(0, 10),
    due_date: now.slice(0, 10),
    tax_rate: 0,
    notes: 'Service changed after payment',
    items: [
      { category: 'activity', description: 'Ras Mohamed dive trip', quantity: 1, unit_price: 100 },
      { category: 'course', description: 'SSI Freediver course', quantity: 1, unit_price: 100 },
    ],
  });
  assert.equal(edited.status, 200);
  const allocationSnapshot = db.prepare('SELECT invoice_item_id, service_label FROM payment_allocations WHERE id = ?')
    .get(allocation.id) as { invoice_item_id: string | null; service_label: string };
  assert.deepEqual(allocationSnapshot, { invoice_item_id: null, service_label: 'SSI Freediver course' });
  const relisted = await request('/finance/invoices');
  const refreshedInvoice = relisted.data.find((entry: any) => entry.id === invoiceId);
  assert.deepEqual(
    refreshedInvoice.items.map((item: any) => [item.description, item.paid_amount, item.remaining_amount]),
    [['Ras Mohamed dive trip', 0, 100], ['SSI Freediver course', 30, 70]],
  );

  assert.throws(
    () => db.prepare('UPDATE payment_allocations SET amount_cents = 1 WHERE id = ?').run(allocation.id),
    /append-only/,
  );
  assert.throws(
    () => db.prepare('DELETE FROM payment_adjustments WHERE id = ?').run(refunded.data.id),
    /append-only/,
  );
  const adjustmentAllocation = db.prepare('SELECT id FROM payment_adjustment_allocations WHERE adjustment_id = ?')
    .get(refunded.data.id) as { id: string };
  assert.throws(
    () => db.prepare('UPDATE payment_adjustment_allocations SET amount_cents = 1 WHERE id = ?').run(adjustmentAllocation.id),
    /append-only/,
  );
  assert.throws(
    () => db.prepare('DELETE FROM payment_adjustment_allocations WHERE id = ?').run(adjustmentAllocation.id),
    /append-only/,
  );
});

test('foreign-currency receipts preserve cash currency and credit EUR invoices at the saved rate', async () => {
  const unauthorized = await request('/finance/fx-rates', 'PUT', {
    rates_to_eur: { EUR: 1, USD: 0.9, EGP: 0.02, GBP: 1.15 },
  }, instructorToken);
  assert.equal(unauthorized.status, 403);

  const configured = await request('/finance/fx-rates', 'PUT', {
    rates_to_eur: { EUR: 1, USD: 0.9, EGP: 0.02, GBP: 1.15 },
  }, ownerToken);
  assert.equal(configured.status, 200, JSON.stringify(configured.data));

  const student = db.prepare('SELECT id FROM students LIMIT 1').get() as { id: string };
  const today = new Date().toISOString().slice(0, 10);
  const invoiceId = 'inv_finance_fx_test';
  const itemId = 'item_finance_fx_test';
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, student_id, issue_date, due_date, currency, subtotal,
      tax_rate, tax_amount, total_amount, paid_amount, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'EUR', 100, 0, 0, 100, 0, 'issued', ?, ?)
  `).run(invoiceId, 'INV-FINANCE-FX-TEST', student.id, today, today, now, now);
  db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, category, description, quantity, unit_price, total_price)
    VALUES (?, ?, 'course', 'EUR course', 1, 100, 100)
  `).run(itemId, invoiceId);

  try {
    const beforeBalances = await request('/finance/cash-balances');
    const recorded = await request(`/finance/invoices/${invoiceId}/payments`, 'POST', {
      amount: 1000,
      currency: 'EGP',
      customer_id: student.id,
      payment_method: 'Cash EGP',
      payment_account: 'FX Test EGP Account',
      payment_date: today,
    });
    assert.equal(recorded.status, 201, JSON.stringify(recorded.data));
    assert.equal(recorded.data.newPaidAmount, 20);

    const savedPayment = db.prepare(`
      SELECT amount, currency, invoice_amount_cents, eur_amount_cents, exchange_rate_to_eur
      FROM payments WHERE id = ?
    `).get(recorded.data.paymentId) as {
      amount: number;
      currency: string;
      invoice_amount_cents: number;
      eur_amount_cents: number;
      exchange_rate_to_eur: number;
    };
    assert.deepEqual(savedPayment, {
      amount: 1000,
      currency: 'EGP',
      invoice_amount_cents: 2000,
      eur_amount_cents: 2000,
      exchange_rate_to_eur: 0.02,
    });
    const autoAllocation = db.prepare('SELECT SUM(amount_cents) AS total FROM payment_allocations WHERE payment_id = ?')
      .get(recorded.data.paymentId) as { total: number };
    assert.equal(autoAllocation.total, 2000);

    const invoices = await request('/finance/invoices');
    const savedInvoice = invoices.data.find((entry: any) => entry.id === invoiceId);
    assert.equal(savedInvoice.paid_amount, 20);
    assert.equal(savedInvoice.payments[0].amount, 1000);
    assert.equal(savedInvoice.payments[0].currency, 'EGP');
    assert.equal(savedInvoice.payments[0].payment_account, 'FX Test EGP Account');
    assert.equal(savedInvoice.payments[0].eur_amount_cents, 2000);

    const afterBalances = await request('/finance/cash-balances');
    assert.equal(
      afterBalances.data.income_by_currency.EGP - beforeBalances.data.income_by_currency.EGP,
      1000,
    );
  } finally {
    await request('/finance/fx-rates', 'PUT', {
      rates_to_eur: { EUR: 1, USD: null, EGP: null, GBP: null },
    }, ownerToken);
  }
});

test('account transfers change balances without appearing as income or expense, and categories stay role-gated', async () => {
  const categories = await request('/finance/categories');
  assert.equal(categories.status, 200);
  assert.ok(categories.data.expense.includes('Taxi driving'));
  assert.ok(categories.data.billing.includes('Bill customer'));
  assert.ok(categories.data.income.includes('FDD Income Receipt'));
  assert.equal((await request('/finance/categories', 'GET', undefined, instructorToken)).status, 403);

  const invalidExpenseCategory = await request('/finance/categories', 'PUT', {
    ...categories.data,
    expense: [...categories.data.expense, 'Bill customer'],
  });
  assert.equal(invalidExpenseCategory.status, 400);
  const invalidIncomeClassification = await request('/finance/categories', 'PUT', {
    ...categories.data,
    income: [...categories.data.income, 'Bill customer'],
  });
  assert.equal(invalidIncomeClassification.status, 400);

  const opening = await request('/finance/account-balances/opening', 'PUT', {
    opening_balances: [
      { account: 'Cash EUR', currency: 'EUR', amount: 100 },
      { account: 'Bank EUR', currency: 'EUR', amount: 20 },
    ],
  });
  assert.equal(opening.status, 200);
  const balancesBefore = await request('/finance/account-balances');
  const beforeByAccount = new Map(balancesBefore.data.map((row: any) => [`${row.currency}:${row.account}`, row.current_balance]));
  const before = await request('/finance/cash-balances');
  const movement = await request('/finance/account-movements', 'POST', {
    movement_type: 'transfer',
    from_account: 'Cash EUR',
    from_currency: 'EUR',
    from_amount: 15.25,
    to_account: 'Bank EUR',
    to_currency: 'EUR',
    to_amount: 15.25,
    movement_date: new Date().toISOString().slice(0, 10),
    reference_number: 'TRANSFER-15',
    notes: 'Cash deposit to bank',
  });
  assert.equal(movement.status, 201);
  const balances = await request('/finance/account-balances');
  const byAccount = new Map(balances.data.map((row: any) => [`${row.currency}:${row.account}`, row.current_balance]));
  assert.equal(byAccount.get('EUR:Cash EUR'), Number(beforeByAccount.get('EUR:Cash EUR')) - 15.25);
  assert.equal(byAccount.get('EUR:Bank EUR'), Number(beforeByAccount.get('EUR:Bank EUR')) + 15.25);
  const after = await request('/finance/cash-balances');
  assert.deepEqual(after.data.income_by_currency, before.data.income_by_currency);
  assert.deepEqual(after.data.expenses_by_currency, before.data.expenses_by_currency);

  const changed = await request('/finance/categories', 'PUT', {
    ...categories.data,
    expense: [...categories.data.expense, 'Test'],
    income: [...categories.data.income, 'Test income category'],
  }, ownerToken);
  assert.equal(changed.status, 200, JSON.stringify(changed.data));
  const restored = await request('/finance/categories', 'PUT', {
    ...categories.data,
    expense: [...categories.data.expense, 'Test'],
  }, ownerToken);
  assert.equal(restored.status, 200);
});

test('expenses post to the selected account and exchanges cannot be misclassified as expenses', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const invalidExchange = await request('/finance/expenses', 'POST', {
    category: 'Exchange',
    vendor_name: 'Currency desk',
    amount: 10,
    currency: 'EUR',
    payment_method: 'Cash EUR',
    payment_account: 'Cash EUR',
    expense_date: today,
    description: 'Currency exchange',
  });
  assert.equal(invalidExchange.status, 400);

  const invalidPrecision = await request('/finance/expenses', 'POST', {
    category: 'Taxi driving',
    vendor_name: 'Dahab Taxi',
    amount: 10.001,
    currency: 'EUR',
    payment_method: 'Cash EUR',
    payment_account: 'Test Expense Account',
    expense_date: today,
    description: 'Airport drop-off',
  });
  assert.equal(invalidPrecision.status, 400);

  const posted = await request('/finance/expenses', 'POST', {
    category: 'Taxi driving',
    vendor_name: 'Dahab Taxi',
    amount: 12.34,
    currency: 'EUR',
    payment_method: 'Cash EUR',
    payment_account: 'Test Expense Account',
    expense_date: today,
    description: 'Airport drop-off',
    receipt_ref: 'TAXI-12',
  });
  assert.equal(posted.status, 201);

  const expenses = await request('/finance/expenses');
  const saved = expenses.data.find((expense: any) => expense.id === posted.data.id);
  assert.equal(saved.payment_account, 'Test Expense Account');
  assert.equal(saved.payment_method, 'Cash EUR');
  assert.ok(saved.created_by_name);

  const opening = await request('/finance/account-balances/opening', 'PUT', {
    opening_balances: [{ account: 'Test Expense Account', currency: 'EUR', amount: 100 }],
  });
  assert.equal(opening.status, 200);
  const balances = await request('/finance/account-balances');
  const account = balances.data.find((row: any) => row.account === 'Test Expense Account' && row.currency === 'EUR');
  assert.equal(account.opening_balance, 100);
  assert.equal(account.expenses, 12.34);
  assert.equal(account.current_balance, 87.66);

  const movements = await request('/finance/account-movements?movement_type=transfer&currency=EUR');
  assert.equal(movements.status, 200);
  assert.ok(movements.data.some((movement: any) => movement.reference_number === 'TRANSFER-15'));

  const replaced = await request('/finance/account-balances/opening', 'PUT', { opening_balances: [] });
  assert.equal(replaced.status, 200);
  const afterReplace = await request('/finance/account-balances');
  const noOpening = afterReplace.data.find((row: any) => row.account === 'Test Expense Account' && row.currency === 'EUR');
  assert.equal(noOpening.opening_balance, 0);

  const backup = await request('/backup/export', 'GET', undefined, ownerToken);
  assert.equal(backup.status, 200);
  for (const table of ['payment_allocations', 'payment_adjustments', 'payment_adjustment_allocations', 'finance_account_movements']) {
    assert.ok(Array.isArray(backup.data.data[table]), `backup contains ${table}`);
  }
});
