import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCsv } from '../packages/csv-parser/index.mjs';
import {
  isFormulaSensitive,
  classifyDateValue,
  profileColumns,
  runDiagnostics,
} from '../packages/diagnostic-engine/index.mjs';
import {
  normalizeDateString,
  normalizePhoneString,
  normalizeCurrencyString,
  executeRule,
  parseHumanFixLanguage,
} from '../packages/repair-rules/index.mjs';
import { suggestColumnMappings } from '../packages/mapping-engine/index.mjs';

test('US E-Commerce: ZIP+4 & SSN never misclassified as phone; truncated ZIP+4 & 4-digit ZIPs padded', () => {
  const csv = 'id,shipping_zip,Employee SSN\n1,02138-1234,123-45-6789\n2,2138-5678,987-65-4321\n3,2138,555-66-7777\n';
  const parsed = parseCsv(csv);
  const profiles = profileColumns(parsed.headers, parsed.rows);
  assert.equal(profiles[1].inferredType, 'postal_code');
  assert.notEqual(profiles[2].inferredType, 'phone');
  assert.equal(profiles[2].sensitiveType, 'id_number');

  const diag = runDiagnostics({ headers: parsed.headers, rows: parsed.rows });
  assert.ok(diag.issues.some((i) => i.code === 'LEADING_ZERO_RISK'));
  assert.equal(diag.issues.some((i) => i.code === 'PHONE_FORMAT_MIXED'), false);

  const padded = executeRule(parsed, { ruleId: 'preserve_leading_zeros', params: { column: 1, minLength: 5 } });
  assert.equal(padded.nextTable.rows[1].cells[1], '02138-5678');
  assert.equal(padded.nextTable.rows[2].cells[1], '02138');
});

test('US Phones & Formula Safety: dot-separated, parenthesized & +1 (212) 555-0142 handled cleanly', () => {
  assert.equal(normalizePhoneString('415.555.0198', 'US'), '+14155550198');
  assert.equal(normalizePhoneString('(415) 555-0198', 'US'), '+14155550198');
  assert.equal(isFormulaSensitive('+1 (212) 555-0142'), false);

  const parsed = parseCsv('id,Direct\n1,(415) 555-0198\n2,415.555.0198\n3,1-800-555-0199\n');
  const profiles = profileColumns(parsed.headers, parsed.rows);
  assert.equal(profiles[1].inferredType, 'phone');
});

test('US Dates & Deduplication: Nov 27 2026, ISO timestamps & MDY keep-latest work cleanly', () => {
  assert.equal(classifyDateValue('Nov 27, 2026'), 'mdy');
  assert.equal(classifyDateValue('2026-11-27T14:30:00Z'), 'iso');
  assert.equal(normalizeDateString('Nov 27, 2026', 'MDY'), '2026-11-27');

  // Same-day ISO timestamps keep later time-of-day
  const t1 = parseCsv('email,updated_at,status\nbob@acme.us,2026-03-05T18:45:00Z,newest\nbob@acme.us,2026-03-05T09:15:00Z,older\n');
  const d1 = executeRule(t1, { ruleId: 'deduplicate_by_key', params: { column: 0, keep: 'latest', dateColumn: 1 } });
  assert.equal(d1.nextTable.rows[0].cells[2], 'newest');

  // US MM/DD/YYYY dates keep Feb 10 over Jan 12
  const t2 = parseCsv('id,order_date,status\nORD-1,01/12/2026,pending\nORD-1,02/10/2026,shipped\n');
  const d2 = executeRule(t2, { ruleId: 'deduplicate_by_key', params: { column: 0, keep: 'latest', dateColumn: 1, datePreference: 'MDY' } });
  assert.equal(d2.nextTable.rows[0].cells[2], 'shipped');
});

test('US Finance & Addresses: trailing minus, $(1,250.00), leading space before quote & clean address merge', () => {
  assert.equal(normalizeCurrencyString('500.00-'), '-500.00');
  assert.equal(normalizeCurrencyString('$1,250.00-'), '-1250.00');
  assert.equal(normalizeCurrencyString('$(1,250.00)'), '-1250.00');

  // Leading space before quoted currency does NOT split thousands comma
  const spaced = parseCsv('id,amount\n1, "($1,250.00)"\n');
  assert.equal(spaced.rows[0].cells.length, 2);
  assert.equal(spaced.rows[0].cells[1], '($1,250.00)');

  // Unquoted multi-comma US address merges without double spaces
  const addr = parseCsv('id,address,zip\n1,123 Main St, Apt 4B, Boston, MA,02138\n');
  const rep = executeRule(addr, { ruleId: 'repair_broken_rows_suggested' });
  assert.equal(rep.nextTable.rows[0].cells[1], '123 Main St, Apt 4B, Boston, MA');
});

test('US PII, CRM Mapping & English NL Prompts: EIN/DOB/snake_case, First/Last/State & USD/keep-latest', () => {
  const pii = parseCsv('EIN,Routing Number,DOB,credit_card,billing_address,mobile_phone,work_email\n1,2,3,4,5,6,7\n');
  const profs = profileColumns(pii.headers, pii.rows);
  assert.ok(profs.every((p) => p.sensitiveType !== null));

  const crm = suggestColumnMappings(
    ['First Name', 'Last Name', 'Work Email', 'Cell Phone', 'State', 'Zip Code'],
    ['First Name', 'Last Name', 'Work Email', 'Cell Phone', 'State', 'Zip Code'].map((name, index) => ({ index, name, inferredType: 'text' })),
    'crm'
  );
  assert.deepEqual(
    crm.map((m) => m.targetField),
    ['first_name', 'last_name', 'email', 'phone', 'state', 'postal_code']
  );

  const plan = parseHumanFixLanguage(
    'Remove blank rows, normalize USD amounts, keep latest contact by updated_at',
    ['contact_id', 'signup_date', 'updated_at', 'amount']
  );
  assert.ok(plan.steps.some((s) => s.ruleId === 'normalize_currency'));
  const dedupeStep = plan.steps.find((s) => s.ruleId === 'deduplicate_by_key');
  assert.equal(dedupeStep?.params?.dateColumn, 2); // updated_at prioritized over signup_date!
  assert.equal(plan.steps.some((s) => s.ruleId === 'normalize_dates'), false); // "updated_at" didn't spuriously trigger date normalization!
});
