import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateEntry, isValidDate } from '../src/validation.js';

const context = {
  projects: [{ id: 'p-1' }, { id: 'p-2' }],
  users: [{ id: 'u-1' }],
};

function entry(overrides = {}) {
  return {
    projectId: 'p-1',
    userId: 'u-1',
    date: '2026-10-05',
    hours: 3.5,
    description: 'Workshop prep',
    ...overrides,
  };
}

test('accepts a complete entry', () => {
  const result = validateEntry(entry(), context);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('rejects an unknown project', () => {
  const result = validateEntry(entry({ projectId: 'p-404' }), context);
  assert.equal(result.valid, false);
  assert.ok(result.errors.projectId);
});

test('rejects hours that are not a number', () => {
  const result = validateEntry(entry({ hours: '4' }), context);
  assert.equal(result.valid, false);
  assert.match(result.errors.hours, /number/);
});

test('rejects more than 24 hours in one entry', () => {
  const result = validateEntry(entry({ hours: 30 }), context);
  assert.equal(result.valid, false);
  assert.match(result.errors.hours, /24/);
});

test('requires a description', () => {
  const result = validateEntry(entry({ description: '   ' }), context);
  assert.equal(result.valid, false);
  assert.ok(result.errors.description);
});

test('isValidDate checks calendar dates', () => {
  assert.equal(isValidDate('2026-10-05'), true);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('10/05/2026'), false);
});
