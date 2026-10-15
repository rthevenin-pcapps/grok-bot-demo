import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildInvoice, formatCurrency } from '../src/invoice.js';

const project = {
  id: 'p-1',
  code: 'TEST-PRJ',
  client: 'Test Client',
  name: 'Website Refresh',
  hourlyRate: 150,
};

const entries = [
  { date: '2026-10-01', userId: 'u-1', description: 'Kickoff', hours: 2 },
  { date: '2026-10-02', userId: 'u-2', description: 'Content audit', hours: 3.5 },
];

test('creates one line item per entry at the project rate', () => {
  const invoice = buildInvoice(project, entries, { issuedOn: '2026-10-14' });
  assert.equal(invoice.number, 'INV-TEST-PRJ-20261014');
  assert.equal(invoice.client, 'Test Client');
  assert.equal(invoice.lineItems.length, 2);
  assert.deepEqual(
    invoice.lineItems.map((item) => [item.hours, item.rate, item.amount]),
    [
      [2, 150, 300],
      [3.5, 150, 525],
    ],
  );
});

test('adds 8% tax to the subtotal', () => {
  const invoice = buildInvoice(project, entries, { issuedOn: '2026-10-14' });
  assert.equal(invoice.subtotal, 825);
  assert.equal(invoice.tax, 66);
  assert.equal(invoice.total, 891);
});

test('rounds amounts to the nearest cent', () => {
  const invoice = buildInvoice({ ...project, hourlyRate: 95.5 }, [{ ...entries[0], hours: 0.75 }], {
    issuedOn: '2026-10-14',
  });
  assert.equal(invoice.lineItems[0].amount, 71.63);
  assert.equal(invoice.tax, 5.73);
  assert.equal(invoice.total, 77.36);
});

test('formats amounts as US dollars', () => {
  assert.equal(formatCurrency(1234.5), '$1,234.50');
  assert.equal(formatCurrency(66), '$66.00');
});
