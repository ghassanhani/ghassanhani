// Arithmetic checks only. The scholar-validated cases (SPEC §2.10) are still to come;
// until they pass, the calculator stays marked "under review" in the app.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NISAB_GOLD_G, NISAB_SILVER_G, ZAKAT_RATE, zakat } from '../src/worship/zakat-core.ts';

const base = { cash: 0, goldG: 0, goldPrice: 100, silverG: 0, silverPrice: 1, trade: 0, owed: 0, debt: 0, basis: 'gold' as const };

test('below the nisab nothing is due', () => {
  const r = zakat({ ...base, cash: NISAB_GOLD_G * 100 - 1 });
  assert.equal(r.due, false);
  assert.equal(r.amount, 0);
});
test('at the nisab the rate applies to the whole net amount', () => {
  const r = zakat({ ...base, cash: NISAB_GOLD_G * 100 });
  assert.equal(r.due, true);
  assert.equal(r.amount, NISAB_GOLD_G * 100 * ZAKAT_RATE);
});
test('debts reduce the net; receivables, gold, silver and trade goods add to it', () => {
  const r = zakat({ ...base, cash: 1000, goldG: 10, silverG: 100, trade: 500, owed: 200, debt: 300 });
  assert.equal(r.net, 1000 + 10 * 100 + 100 * 1 + 500 + 200 - 300);
});
test('the silver basis uses the silver nisab', () => {
  assert.equal(zakat({ ...base, basis: 'silver' }).nisab, NISAB_SILVER_G * 1);
});
test('without a price there is no nisab and nothing is due', () => {
  assert.equal(zakat({ ...base, goldPrice: 0, cash: 1e6 }).due, false);
});
