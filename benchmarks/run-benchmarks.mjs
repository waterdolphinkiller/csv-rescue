/**
 * @fileoverview CSV Rescue v2.0 — 100,000-Row Stress Test & Reproducible Benchmark Runner.
 * Measures:
 *   1. Streaming Parse + Single-Pass Full Diagnostics (1k, 20k, 100k rows)
 *   2. Incremental 1-Column Re-Diagnosis vs Full Re-Diagnosis speedup
 *   3. Compact Patch Undo latency vs legacy full deep-clone
 *   4. Mid-stream AbortController cancellation latency (< 500ms target)
 */

import { performance } from 'node:perf_hooks';
import { encodeUtf8, formatBytes } from '../packages/shared-types/index.mjs';
import { detectEncodingCandidates, decodeBytes } from '../packages/encoding-detector/index.mjs';
import { detectDialect } from '../packages/dialect-detector/index.mjs';
import { parseCsvStream } from '../packages/csv-parser/index.mjs';
import { runDiagnostics, runDiagnosticsIncremental } from '../packages/diagnostic-engine/index.mjs';
import { executeRule, applyInversePatch } from '../packages/repair-rules/index.mjs';

function generateSyntheticCsv(rowCount, mode = 'mixed') {
  const lines = new Array(rowCount + 1);
  lines[0] = 'order_id,customer_name,email,phone,address,postal_code,order_date,amount,notes';
  for (let i = 1; i <= rowCount; i++) {
    if (mode === 'mixed' && i % 500 === 0) {
      lines[i] = `ORD-${i},User ${i},USER${i}@EXAMPLE.MY,0123456789,12 Jalan Merah, Kuala Lumpur,05100,04/03/2026,RM 99.00,Unquoted comma`;
    } else if (mode === 'mixed' && i % 1000 === 0) {
      lines[i] = `ORD-${i},User ${i},user${i}@example.my,0123456789,"KL",50000,2026-03-04,RM 50.00,=HYPERLINK("http://example.com")`;
    } else if (mode === 'mixed' && i % 20 === 0) {
      lines[i] = `ORD-${i},User ${i},USER${i}@EXAMPLE.MY,0123456789,"KL",05100,2026-03-04,RM 120.00,OK`;
    } else {
      lines[i] = `ORD-${i},User ${i},user${i}@example.my,0123456789,"KL",05100,2026-03-04,RM 120.00,OK`;
    }
  }
  return lines.join('\r\n') + '\r\n';
}

async function benchScale(label, rowCount) {
  const csvStr = generateSyntheticCsv(rowCount, 'mixed');
  const bytes = encodeUtf8(csvStr);

  const t0 = performance.now();
  const enc = detectEncodingCandidates(bytes);
  const decoded = decodeBytes(bytes, enc.recommended);
  const dialect = detectDialect(decoded.text);
  const parsed = await parseCsvStream(decoded.text, {
    delimiter: dialect.delimiter,
    hasHeader: true,
    chunkLines: 15000,
  });
  const tParse = performance.now() - t0;

  const tDiagStart = performance.now();
  const diag = runDiagnostics({
    headers: parsed.headers,
    rows: parsed.rows,
    parseErrors: parsed.parseErrors,
    encodingReport: enc,
    dialectReport: dialect,
    fileSizeBytes: bytes.length,
  });
  const tFullDiag = performance.now() - tDiagStart;

  // Apply 1-column rule (lowercase email) with mutateInPlace + Patch Undo
  const table = { headers: parsed.headers, rows: parsed.rows };
  const tRuleStart = performance.now();
  const ruleRes = executeRule(table, { ruleId: 'lowercase_column', params: { column: 2 } }, { mutateInPlace: true });
  const tRule = performance.now() - tRuleStart;

  // Incremental re-diagnosis on dirty column [2] vs Full re-diagnosis
  const tIncStart = performance.now();
  const incDiag = runDiagnosticsIncremental(diag, {
    headers: ruleRes.nextTable.headers,
    rows: ruleRes.nextTable.rows,
    dirtyColumns: ruleRes.dirtyColumns,
  });
  const tIncDiag = performance.now() - tIncStart;

  // Patch Undo timing
  const tUndoStart = performance.now();
  applyInversePatch(ruleRes.nextTable, ruleRes.inversePatch);
  const tPatchUndo = performance.now() - tUndoStart;

  const heapMb = Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1));

  return {
    case: label,
    rows: rowCount,
    size: formatBytes(bytes.length),
    streamParseMs: Number(tParse.toFixed(1)),
    fullDiagMs: Number(tFullDiag.toFixed(1)),
    incDiagMs: Number(tIncDiag.toFixed(1)),
    incSpeedup: `${(tFullDiag / Math.max(0.1, tIncDiag)).toFixed(1)}x`,
    ruleMs: Number(tRule.toFixed(1)),
    patchUndoMs: Number(tPatchUndo.toFixed(1)),
    heapMB: heapMb,
    issuesAfterInc: incDiag.summary.totalIssues,
  };
}

async function benchAbortLatency() {
  const csvStr = generateSyntheticCsv(100000, 'mixed');
  const controller = new AbortController();
  let tAbortIssued = 0;
  let aborted = false;

  const promise = parseCsvStream(csvStr, {
    chunkLines: 10000,
    signal: controller.signal,
    onProgress: (info) => {
      if (info.rowsParsed >= 20000 && !controller.signal.aborted) {
        tAbortIssued = performance.now();
        controller.abort();
      }
    },
  }).catch((err) => {
    if (err.name === 'AbortError') aborted = true;
    else throw err;
  });

  await promise;
  const abortLatencyMs = Number((performance.now() - tAbortIssued).toFixed(2));
  return { aborted, abortLatencyMs };
}

console.log('=== CSV Rescue v2.0 — 100k-Row Stress Test & Incremental Kernel Benchmark ===\n');
const rows = [];
rows.push(await benchScale('S1 (1k rows)', 1000));
rows.push(await benchScale('S2 (20k rows)', 20000));
rows.push(await benchScale('M1 (100k rows)', 100000));
console.table(rows);

const abortRes = await benchAbortLatency();
console.log(`\nMid-stream AbortController cancellation on 100k rows: aborted=${abortRes.aborted}, response=${abortRes.abortLatencyMs} ms (target <= 500 ms)`);
