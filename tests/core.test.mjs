import test from 'node:test';
import assert from 'node:assert/strict';

import { encodeUtf8, sha256Hex } from '../packages/shared-types/index.mjs';
import { createPluginRegistry, validateRuleParams } from '../packages/plugin-registry/index.mjs';
import { detectBom, detectEncodingCandidates, decodeBytes } from '../packages/encoding-detector/index.mjs';
import { detectDialect, detectHeaderRow } from '../packages/dialect-detector/index.mjs';
import { parseCsv, parseCsvStream, serializeCsv } from '../packages/csv-parser/index.mjs';
import {
  runDiagnostics,
  runDiagnosticsIncremental,
  isFormulaSensitive,
  classifyDateValue,
} from '../packages/diagnostic-engine/index.mjs';
import {
  executeRule,
  applyInversePatch,
  normalizeDateString,
  normalizePhoneString,
  normalizeCurrencyString,
  parseHumanFixLanguage,
} from '../packages/repair-rules/index.mjs';
import {
  suggestColumnMappings,
  detectSchemaDrift,
  applyColumnMapping,
} from '../packages/mapping-engine/index.mjs';
import {
  buildIntegrityLedger,
  diffCsvTables,
  inspectBatchAlignment,
  mergeBatchFiles,
} from '../packages/quality-profile/index.mjs';
import {
  applyFormulaProtection,
  buildSafeExport,
  generateRepairReceipt,
} from '../packages/export-engine/index.mjs';

test('Encoding Detective: detects UTF-8 BOM and flags pre-existing U+FFFD damage', () => {
  const bomBytes = new Uint8Array([0xef, 0xbb, 0xbf, ...encodeUtf8('name,city\n陈小明,吉隆坡\n')]);
  assert.equal(detectBom(bomBytes).bom, 'utf-8-bom');
  const rep = detectEncodingCandidates(bomBytes);
  assert.equal(rep.recommended, 'utf-8-bom');
  assert.equal(rep.hasPreexistingReplacementChars, false);
  assert.ok(decodeBytes(bomBytes, 'utf-8-bom').text.includes('陈小明'));

  const damaged = new Uint8Array([0x61, 0x2c, 0xef, 0xbf, 0xbd, 0x0a]);
  assert.equal(detectEncodingCandidates(damaged).hasPreexistingReplacementChars, true);
});

test('Dialect Detector: identifies semicolon and tab delimiters accurately', () => {
  const semi = detectDialect('a;b;c\r\n1;2;3\r\n4;5;6\r\n');
  assert.equal(semi.delimiter, ';');
  assert.equal(semi.expectedColumns, 3);
  assert.equal(semi.lineEnding, '\r\n');

  const tsv = detectDialect('id\tname\tscore\n1\tAlice\t99\n2\tBob\t88\n');
  assert.equal(tsv.delimiter, '\t');
  assert.equal(detectHeaderRow(['id', 'name', 'email'], [['1', 'Alice', 'a@b.com']]).hasHeader, true);
});

test('Fault-tolerant Streaming Parser & AbortController: isolates unclosed quote and cancels mid-stream', async () => {
  const csv = 'id,name,notes\n1,"Broken quote,test\n2,Valid User,ok\n';
  const parsed = parseCsv(csv, { delimiter: ',', hasHeader: true });
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].hasQuoteIssue, true);
  assert.equal(parsed.rows[1].cells[1], 'Valid User');

  // Test AbortController cancellation on parseCsvStream
  const bigLines = ['id,val'];
  for (let i = 0; i < 30000; i++) bigLines.push(`${i},value_${i}`);
  const bigCsv = bigLines.join('\n');
  const ctrl = new AbortController();
  ctrl.abort();
  await assert.rejects(
    () => parseCsvStream(bigCsv, { signal: ctrl.signal }),
    (err) => err.name === 'AbortError'
  );
});

test('Diagnostic Engine & Incremental Column Re-Diagnosis (v2.0)', () => {
  const csv = [
    'order_id,email,phone,address,postal_code,order_date,notes',
    '1,USER@TEST.COM,0123456789,12 Jalan Merah, Kuala Lumpur,05100,04/03/2026,ok',
    '2,bad-email,0198887777,"KL",05100,2026-03-04,=CMD|"/C calc"!A0',
    '2,bad-email,0198887777,"KL",05100,2026-03-04,=CMD|"/C calc"!A0',
    '3,UPPER@TEST.MY,0171112222,"Penang",10250,04/03/2026,ok',
    ',,,,,,',
  ].join('\n');

  const parsed = parseCsv(csv, { delimiter: ',', hasHeader: true });
  const diag = runDiagnostics({ headers: parsed.headers, rows: parsed.rows });

  const codes = new Set(diag.issues.map((i) => i.code));
  assert.ok(codes.has('ROW_WIDTH_MISMATCH'));
  assert.ok(codes.has('BLANK_ROWS'));
  assert.ok(codes.has('DUPLICATE_ROWS'));
  assert.ok(codes.has('MIXED_OR_AMBIGUOUS_DATES'));
  assert.ok(codes.has('LEADING_ZERO_RISK'));
  assert.ok(codes.has('FORMULA_INJECTION_RISK'));
  assert.ok(codes.has('EMAIL_MIXED_CASE'));
  assert.equal(isFormulaSensitive('=SUM(1,2)'), true);
  assert.equal(isFormulaSensitive('-42.50'), false);
  assert.equal(classifyDateValue('04/03/2026'), 'ambiguous');

  // Apply lowercase on email column [1] and run incremental diagnostics
  const res = executeRule({ headers: parsed.headers, rows: parsed.rows }, { ruleId: 'lowercase_column', params: { column: 1 } });
  assert.deepEqual(res.dirtyColumns, [1]);
  const incDiag = runDiagnosticsIncremental(diag, {
    headers: res.nextTable.headers,
    rows: res.nextTable.rows,
    dirtyColumns: res.dirtyColumns,
  });
  assert.equal(incDiag.wasIncremental, true);
  assert.equal(incDiag.issues.some((i) => i.code === 'EMAIL_MIXED_CASE'), false);
});

test('Plugin Registry (v2.0): custom diagnostic, custom repair rule with schema gate & custom Region Pack', () => {
  const reg = createPluginRegistry();

  // Register custom Indonesia (+62) Region Pack
  reg.registerRegionPack({
    id: 'ID',
    name: 'Indonesia',
    dialCode: '+62',
    normalizePhone(cleaned) {
      if (cleaned.startsWith('08')) return `+62${cleaned.slice(1)}`;
      return null;
    },
  });
  assert.equal(normalizePhoneString('0812-3456-7890', 'ID', reg), '+6281234567890');
  assert.equal(normalizePhoneString('13800138000', 'CN', reg), '+8613800138000');
  assert.equal(normalizePhoneString('415-555-2671', 'US', reg), '+14155552671');

  // Register custom diagnostic plugin
  reg.registerDiagnostic({
    id: 'check_forbidden_sku',
    category: 'columns',
    run({ headers, rows }) {
      const idx = headers.indexOf('sku');
      if (idx < 0) return { issues: [] };
      const bad = rows.filter((r) => r.cells[idx] === 'FORBIDDEN');
      return {
        issues: bad.length
          ? [{ id: 'custom_sku', code: 'CUSTOM_SKU', category: 'columns', severity: 'warning', affectedRows: bad.map((r) => r.rowNumber), affectedCount: bad.length, title: 'Forbidden SKU', explanation: 'Custom plugin hit', risk: 'low', confidence: 'high', requiresConfirmation: true, suggestedActions: [] }]
          : [],
      };
    },
  });

  const parsed = parseCsv('sku,name\nFORBIDDEN,Test Item\n');
  const diag = runDiagnostics({ headers: parsed.headers, rows: parsed.rows, registry: reg });
  assert.ok(diag.issues.some((i) => i.code === 'CUSTOM_SKU'));

  // Register custom rule plugin with strict schema validation
  reg.registerRule({
    id: 'prefix_column',
    schema: {
      column: { type: 'number', required: true },
      prefix: { type: 'string', required: true },
    },
    execute(table, params) {
      const patches = [];
      table.rows.forEach((r, i) => {
        patches.push([i, params.column, r.cells[params.column]]);
        r.cells[params.column] = params.prefix + r.cells[params.column];
      });
      return {
        ruleId: 'prefix_column',
        description: `Prefix col ${params.column}`,
        affectedRows: table.rows.length,
        affectedCells: table.rows.length,
        removedRows: 0,
        samples: [],
        dirtyColumns: [params.column],
        inversePatch: { type: 'cell_patches', patches },
        nextTable: table,
      };
    },
  });

  // Invalid params rejected by Schema Gate
  assert.equal(validateRuleParams({ column: 'not-a-number' }, { column: { type: 'number', required: true } }).valid, false);
  assert.throws(() => executeRule(parsed, { ruleId: 'prefix_column', params: { column: 'bad' } }, { registry: reg }));

  // Valid params succeed + Patch Undo restores exact value
  const applied = executeRule(parsed, { ruleId: 'prefix_column', params: { column: 0, prefix: 'MY-' } }, { registry: reg });
  assert.equal(applied.nextTable.rows[0].cells[0], 'MY-FORBIDDEN');
  const undone = applyInversePatch(applied.nextTable, applied.inversePatch);
  assert.equal(undone.rows[0].cells[0], 'FORBIDDEN');
});

test('Repair Rules & Compact Patch Undo: restores rows, cells, and backup columns accurately', () => {
  assert.equal(normalizeDateString('04/03/2026', 'DMY'), '2026-03-04');
  assert.equal(normalizeDateString('04/03/2026', 'MDY'), '2026-04-03');
  assert.equal(normalizePhoneString('012-3456789', 'MY'), '+60123456789');
  assert.equal(normalizePhoneString('91234567', 'SG'), '+6591234567');
  assert.equal(normalizeCurrencyString('RM 1,250.50'), '1250.50');

  const csv = 'id,email,phone,updated_at\n1, A@B.COM ,0123456789,2026-01-01\n1,a@b.com,0123456789,2026-02-01\n,,,\n';
  const parsed = parseCsv(csv, { delimiter: ',', hasHeader: true });

  const plan = parseHumanFixLanguage(
    '删除空白行，把邮箱统一成小写，保留最新订单，电话号码统一加国家代码，最后导出 Excel 可以打开的 CSV',
    parsed.headers
  );
  assert.ok(plan.steps.length >= 3);
  assert.equal(plan.exportHints.format, 'csv-bom');

  let tbl = { headers: parsed.headers, rows: parsed.rows };
  const patches = [];
  for (const step of plan.steps) {
    const res = executeRule(tbl, step, { mutateInPlace: true });
    patches.push(res.inversePatch);
    tbl = res.nextTable;
  }
  assert.equal(tbl.rows.length, 1);
  assert.equal(tbl.rows[0].cells[1], 'a@b.com');
  assert.equal(tbl.rows[0].cells[2], '+60123456789');

  // Unwind all patches in reverse order -> should restore all 3 original rows & original headers!
  while (patches.length > 0) {
    tbl = applyInversePatch(tbl, patches.pop());
  }
  assert.equal(tbl.rows.length, 3);
  assert.equal(tbl.headers.length, 4);
  assert.equal(tbl.rows[0].cells[1], ' A@B.COM ');
});

test('Mapping Engine & Supplier Memory: alias mapping and Schema Drift detection', () => {
  const headers = ['SKU Code', 'Item Desc', 'Unit Price', 'New Extra Col'];
  const profiles = headers.map((name, index) => ({ index, name, inferredType: 'text' }));
  const suggested = suggestColumnMappings(headers, profiles, 'ecommerce');

  assert.equal(suggested[0].targetField, 'sku');
  assert.equal(suggested[1].targetField, 'product_name');

  const drift = detectSchemaDrift(headers, {
    name: 'Supplier A',
    version: 1,
    sourceHeaders: ['SKU Code', 'Item Desc', 'Unit Price', 'Old Removed Col'],
    mapping: { 'SKU Code': 'sku' },
  });
  assert.equal(drift.hasDrift, true);
  assert.deepEqual(drift.addedColumns, ['New Extra Col']);
  assert.deepEqual(drift.missingColumns, ['Old Removed Col']);

  const mapped = applyColumnMapping({ headers, rows: [{ cells: ['S1', 'Mug', '10', 'X'] }] }, suggested, false);
  assert.deepEqual(mapped.headers, ['sku', 'product_name', 'price']);
});

test('Batch Merge & CSV Diff: detects schema conflicts, merges with cross-file dedupe & diffs', () => {
  const f1 = parseCsv('sku,name,warehouse\nS1,Lamp,KL\nS2,Hub,KL\n');
  const f2 = parseCsv('sku,name,currency\nS2,Hub,SGD\nS3,Mouse,SGD\n');

  const alignment = inspectBatchAlignment([
    { fileName: 'f1.csv', headers: f1.headers, rows: f1.rows },
    { fileName: 'f2.csv', headers: f2.headers, rows: f2.rows },
  ]);
  assert.equal(alignment.isSchemaIdentical, false);

  const merged = mergeBatchFiles(
    [
      { fileName: 'f1.csv', headers: f1.headers, rows: f1.rows },
      { fileName: 'f2.csv', headers: f2.headers, rows: f2.rows },
    ],
    { dedupeKey: 'sku', includeSourceColumn: true }
  );
  assert.equal(merged.rows.length, 3);
  assert.equal(merged.crossFileDuplicatesRemoved, 1);

  const diff = diffCsvTables(f1, f2, 0);
  assert.equal(diff.summary.addedCount, 1);
  assert.equal(diff.summary.removedCount, 1);
});

test('Safe Export & Privacy-Safe Repair Receipt: formula protection, BOM, SHA-256 & zero raw cell leakage', async () => {
  const table = {
    headers: ['id', 'secret_email', 'note'],
    rows: [{ cells: ['1', 'ceo-private@company.my', '=HYPERLINK("http://evil")'] }],
  };

  const { rows: protectedRows, protectedCount } = applyFormulaProtection(
    table.rows.map((r) => r.cells),
    'prefix_quote'
  );
  assert.equal(protectedCount, 1);
  assert.equal(protectedRows[0][2], '\'=HYPERLINK("http://evil")');

  const exported = await buildSafeExport(table, {
    format: 'csv-bom',
    formulaProtection: 'prefix_quote',
  });
  assert.equal(exported.bytes[0], 0xef);
  assert.equal(exported.outputHash.length, 64);

  const inputHash = await sha256Hex(encodeUtf8(serializeCsv(table.headers, table.rows.map((r) => r.cells))));
  const ledger = buildIntegrityLedger({
    originalRowCount: 1,
    currentRowCount: 1,
    originalColCount: 3,
    currentColCount: 3,
    originalBytesLength: 60,
    outputBytesLength: exported.byteLength,
    appliedRules: [],
    unresolvedCount: 0,
    autoFixedCount: 0,
    userConfirmedCount: 0,
    keptOriginalCount: 0,
    encoding: 'utf-8',
    delimiter: ',',
    inputHash,
    outputHash: exported.outputHash,
  });

  const receipt = generateRepairReceipt({
    fileName: 'test.csv',
    inputHash,
    outputHash: exported.outputHash,
    encoding: 'utf-8',
    delimiter: ',',
    exportFormat: 'csv-bom',
    formulaProtectionMode: 'prefix_quote',
    formulaProtectedCount: 1,
    ledger,
    appliedRules: [],
    unresolvedItems: [],
  });

  assert.equal(JSON.stringify(receipt.json).includes('ceo-private@company.my'), false);
  assert.equal(receipt.html.includes('ceo-private@company.my'), false);
});
