import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { encodeUtf8 } from '../packages/shared-types/index.mjs';
import { detectEncodingCandidates } from '../packages/encoding-detector/index.mjs';
import { parseCsv } from '../packages/csv-parser/index.mjs';
import { isFormulaSensitive, runDiagnostics, runDiagnosticsIncremental } from '../packages/diagnostic-engine/index.mjs';
import {
  normalizeDateString,
  normalizePhoneString,
  normalizeCurrencyString,
  executeRule,
  parseHumanFixLanguage,
} from '../packages/repair-rules/index.mjs';
import { diffCsvTables, inspectBatchAlignment } from '../packages/quality-profile/index.mjs';
import { buildSafeExport, serializeSpreadsheetXml, generateHumanReviewHtml } from '../packages/export-engine/index.mjs';
import { assertPathAllowed } from '../packages/agent-api/index.mjs';

test('Regression: pure CR (\\r) and mixed line endings split rows accurately', () => {
  const cr = parseCsv('id,name,city\r1,Alice,KL\r2,Bob,SG\r3,Carol,JB');
  assert.deepEqual(cr.headers, ['id', 'name', 'city']);
  assert.equal(cr.rows.length, 3);
  assert.deepEqual(cr.rows[1].cells, ['2', 'Bob', 'SG']);

  const mixed = parseCsv('id,name\r\n1,Alice\n2,Bob\r3,Carol\r\n4,Dave');
  assert.equal(mixed.rows.length, 4);
  assert.deepEqual(mixed.rows[2].cells, ['3', 'Carol']);
});

test('Regression: UTF-8 >32KB boundary char & all-0xFF binary garbage detection', () => {
  const utf8Boundary = encodeUtf8('a'.repeat(32766) + '中文测试\n');
  assert.equal(detectEncodingCandidates(utf8Boundary).recommended, 'utf-8');

  const binFF = new Uint8Array(64).fill(0xff);
  assert.notEqual(detectEncodingCandidates(binFF).recommended, 'big5');
});

test('Regression: invalid calendar dates rejected, YYYY/MM/DD supported, currency EU & negative fixed', () => {
  assert.equal(normalizeDateString('31/02/2026', 'DMY'), '31/02/2026');
  assert.equal(normalizeDateString('29/02/2026', 'DMY'), '29/02/2026');
  assert.equal(normalizeDateString('29/02/2024', 'DMY'), '2024-02-29');
  assert.equal(normalizeDateString('2026/03/15', 'DMY'), '2026-03-15');

  assert.equal(normalizeCurrencyString('€1.234,56'), '1234.56');
  assert.equal(normalizeCurrencyString('-$1,250.50'), '-1250.50');
  assert.equal(normalizeCurrencyString('-RM 300.00'), '-300.00');
  assert.equal(normalizeCurrencyString('(RM 450.00)'), '-450.00');

  assert.equal(normalizePhoneString('+6012-3456789 ext 12', 'MY'), '+6012-3456789 ext 12');
  assert.equal(normalizePhoneString('0abc-def-ghi', 'MY'), '0abc-def-ghi');
});

test('Regression: OWASP formula injection in headers, whitespace/arithmetic bypasses, XML control chars & HTML5 script escape', async () => {
  assert.equal(isFormulaSensitive('\t+1+1'), true);
  assert.equal(isFormulaSensitive('\n=1+1'), true);
  assert.equal(isFormulaSensitive('-1-1'), true);
  assert.equal(isFormulaSensitive('-1(2)'), true);
  assert.equal(isFormulaSensitive('-42.50'), false);
  assert.equal(isFormulaSensitive('-$1,250.50'), false);
  assert.equal(isFormulaSensitive('+60 12-345 6789'), false);

  const exp = await buildSafeExport(
    { headers: ['=cmd|calc', 'normal'], rows: [{ cells: ['ok', '1'] }] },
    { format: 'csv', formulaProtection: 'prefix_quote' }
  );
  assert.ok(exp.text.startsWith("'=cmd|calc"));

  const xml = serializeSpreadsheetXml(['a'], [['abc\x00\x0Bdef']]);
  assert.equal(xml.includes('\x00'), false);
  assert.equal(xml.includes('\x0B'), false);

  const review = generateHumanReviewHtml({
    fileName: 'test.csv',
    headers: ['a'],
    appliedRules: [],
    uncertaintyItems: [{ id: '1', rowNumber: 1, sourceLine: 2, issueCode: 'X', title: '<!--<script>', reason: 'r', raw: '<!--<script>', originalCells: ['<!--<script>'] }],
    rowsBefore: 1,
    rowsAfter: 1,
  });
  assert.equal(review.includes('<!--<script>'), false);
});

test('Regression: MCP --allow-dir blocks symlink escape outside sandbox', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-rescue-sym-'));
  const allowDir = path.join(base, 'allow');
  const evilDir = path.join(base, 'allow-evil');
  await fs.mkdir(allowDir);
  await fs.mkdir(evilDir);
  const secretFile = path.join(evilDir, 'secret.csv');
  await fs.writeFile(secretFile, 'secret\nTOP_SECRET\n');
  const symlinkPath = path.join(allowDir, 'escape.csv');
  await fs.symlink(secretFile, symlinkPath);

  try {
    const check = assertPathAllowed(symlinkPath, [allowDir]);
    assert.equal(check.ok, false);
    assert.equal(check.errorCode, 'PATH_OUTSIDE_SANDBOX');
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('Regression: incremental diagnostics syncs formulaHits, self-merge safe, diff by header name & NL word boundaries', () => {
  const parsed = parseCsv('id,note,email\n1,hello,alice@example.com\n2,world,bob@example.com\n');
  const d0 = runDiagnostics({ headers: parsed.headers, rows: parsed.rows });
  parsed.rows[0].cells[1] = '=SUM(A1:A2)';
  const dInc = runDiagnosticsIncremental(d0, { headers: parsed.headers, rows: parsed.rows, dirtyColumns: [1] });
  assert.equal(dInc.summary.formulaHitCount, 1);
  assert.ok(dInc.issues.some((i) => i.code === 'FORMULA_INJECTION_RISK'));

  // Self-merge should NOT delete column 0
  const m = executeRule({ headers: ['a', 'b'], rows: [{ id: 'r1', rowNumber: 1, cells: ['x', 'y'] }] }, { ruleId: 'merge_columns', params: { columnA: 0, columnB: 0 } });
  assert.deepEqual(m.nextTable.headers, ['a', 'b']);

  // Diff compares by header name (reordered columns -> 0 modifications)
  const diff = diffCsvTables(
    { headers: ['id', 'name', 'price'], rows: [{ cells: ['1', 'Widget', '10.00'] }] },
    { headers: ['id', 'price', 'name'], rows: [{ cells: ['1', '10.00', 'Widget'] }] },
    0
  );
  assert.equal(diff.summary.modifiedCount, 0);

  // Batch alignment does not mask missing col when another file has duplicate header
  const align = inspectBatchAlignment([
    { fileName: 'f1.csv', headers: ['id', 'tag', 'tag'], rows: [] },
    { fileName: 'f2.csv', headers: ['id', 'other'], rows: [] },
  ]);
  assert.ok(align.schemaConflicts.some((c) => c.column === 'tag'));

  // NL word boundary fixes
  const plan = parseHumanFixLanguage('Remove blank rows and use DD/MM/YYYY for customer date column', ['id', 'customer_date', 'price']);
  assert.equal(plan.steps.some((s) => s.ruleId === 'normalize_currency'), false);
  const dateStep = plan.steps.find((s) => s.ruleId === 'normalize_dates');
  assert.equal(dateStep?.params?.preference, 'DMY');
});
