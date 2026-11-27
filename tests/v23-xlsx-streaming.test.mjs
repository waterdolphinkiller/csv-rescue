import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { isXlsxBytes, readXlsxWorkbook } from '../packages/xlsx-reader/index.mjs';
import { diagnoseCsvFileStreaming } from '../packages/streaming-engine/index.mjs';
import { csvInspect } from '../packages/agent-api/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('v2.3 Native .xlsx Reader: parses real multi-sheet openpyxl workbook with zero dependencies', async () => {
  const xlsxPath = path.join(rootDir, 'fixtures/vendor/us_orders_sample.xlsx');
  const bytes = new Uint8Array(await fs.readFile(xlsxPath));
  assert.equal(isXlsxBytes(bytes), true);

  const wb1 = await readXlsxWorkbook(bytes);
  assert.deepEqual(wb1.sheetNames, ['US_Orders', 'Supplier_Catalog']);
  assert.equal(wb1.activeSheet, 'US_Orders');
  assert.equal(wb1.rows.length, 3);
  assert.equal(wb1.rows[0].cells[4], '02138'); // leading zero preserved!
  assert.equal(wb1.rows[1].cells[1], 'Wei Chen (陈伟)'); // UTF-8 CJK preserved!
  assert.equal(wb1.rows[2].cells[7], '=HYPERLINK("http://evil.example")');

  const wb2 = await readXlsxWorkbook(bytes, { sheetName: 'Supplier_Catalog' });
  assert.equal(wb2.activeSheet, 'Supplier_Catalog');
  assert.equal(wb2.rows.length, 2);
  assert.equal(wb2.rows[0].cells[1], '24" Monitor');
});

test('v2.3 Agent API / MCP: csvInspect reads native .xlsx sheets and flags formula/email issues', async () => {
  const xlsxPath = path.join(rootDir, 'fixtures/vendor/us_orders_sample.xlsx');
  const res = await csvInspect({ filePath: xlsxPath });
  assert.equal(res.ok, true);
  assert.equal(res.file.isXlsx, true);
  assert.deepEqual(res.file.sheetNames, ['US_Orders', 'Supplier_Catalog']);
  assert.equal(res.summary.formulaSensitiveCells, 1);
  assert.ok(res.issues.some((i) => i.code === 'INVALID_EMAIL'));
  assert.ok(res.issues.some((i) => i.code === 'LEADING_ZERO_RISK'));
});

test('v2.3 O(1) Constant-Memory Streaming Engine: diagnoses 500,000-row (~42 MB) CSV cleanly', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-rescue-stream-'));
  const bigPath = path.join(tmpDir, 'half_million.csv');
  try {
    // Write 500,000 rows (~42 MB) in chunks
    const fh = await fs.open(bigPath, 'w');
    await fh.write('order_id,customer_name,email,phone,address,zip_code,order_date,amount,notes\r\n');
    const chunkSize = 10000;
    for (let base = 0; base < 500000; base += chunkSize) {
      const lines = new Array(chunkSize);
      for (let j = 0; j < chunkSize; j++) {
        const i = base + j + 1;
        if (i % 50000 === 0) {
          lines[j] = `ORD-${i},User ${i},user${i}@acme.us,415-555-0198,"Boston, MA",02138,2026-11-27,$99.00,=SUM(1+1)`;
        } else if (i % 100000 === 0) {
          lines[j] = `ORD-${i},User ${i},user${i}@acme.us,415-555-0198,123 Main St, Apt 4,02138,2026-11-27,$99.00,broken`;
        } else {
          lines[j] = `ORD-${i},User ${i},user${i}@acme.us,415-555-0198,"Boston, MA",02138,2026-11-27,$99.00,OK`;
        }
      }
      await fh.write(lines.join('\r\n') + '\r\n');
    }
    await fh.close();

    const t0 = performance.now();
    const res = await diagnoseCsvFileStreaming(bigPath);
    const elapsedMs = Number((performance.now() - t0).toFixed(1));
    const heapMb = Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1));

    console.log(`  [500k-Row Streaming Benchmark] Size=${(res.file.bytes / (1024 * 1024)).toFixed(2)} MB, Rows=${res.file.rows}, Time=${elapsedMs} ms, Heap=${heapMb} MB`);
    assert.equal(res.ok, true);
    assert.equal(res.mode, 'constant-memory-streaming');
    assert.equal(res.file.rows, 500000);
    assert.equal(res.summary.formulaSensitiveCells, 10);
    assert.equal(res.file.sha256.length, 64);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
