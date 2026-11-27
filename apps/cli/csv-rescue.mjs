#!/usr/bin/env node
/**
 * @fileoverview CSV Rescue CLI — diagnose, clean, and safely export CSV files locally.
 * Usage:
 *   node apps/cli/csv-rescue.mjs diagnose <input.csv> [--json]
 *   node apps/cli/csv-rescue.mjs clean <input.csv> --out <output.csv> [--receipt <receipt.json>] [--trim] [--remove-blanks] [--dedupe] [--formula-protect quote|tab|none] [--format csv-bom|csv|tsv|json]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { sha256Hex, formatBytes } from '../../packages/shared-types/index.mjs';
import { detectEncodingCandidates, decodeBytes } from '../../packages/encoding-detector/index.mjs';
import { detectDialect, detectHeaderRow } from '../../packages/dialect-detector/index.mjs';
import { parseCsv } from '../../packages/csv-parser/index.mjs';
import { isXlsxBytes, readXlsxWorkbook } from '../../packages/xlsx-reader/index.mjs';
import { runDiagnostics } from '../../packages/diagnostic-engine/index.mjs';
import { executeRule } from '../../packages/repair-rules/index.mjs';
import { buildIntegrityLedger } from '../../packages/quality-profile/index.mjs';
import { buildSafeExport, generateRepairReceipt } from '../../packages/export-engine/index.mjs';
import { csvInspect } from '../../packages/agent-api/index.mjs';

function printHelp() {
  console.log(`CSV Rescue CLI v1.0.0 — Fix messy CSV files without guessing.

Commands:
  diagnose <file> [options]
    --json                    Output full JSON health report
    --encoding <id>           Force encoding (utf-8, utf-8-bom, utf-16le, windows-1252, gb18030, etc.)

  clean <file> --out <output> [options]
    --format <fmt>            csv-bom (default), csv, tsv, json, excel-xml
    --trim                    Trim leading/trailing whitespace
    --remove-blanks           Remove blank rows
    --remove-rep-headers      Remove repeated header rows
    --dedupe                  Remove exact duplicate rows
    --formula-protect <mode>  none (default), prefix_quote, prefix_tab
    --receipt <path>          Write privacy-safe repair receipt (.json or .html)
`);
}

function getFlag(args, name, fallback = null) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  const filePath = args[1];
  if (!filePath) {
    console.error('Error: Please provide an input CSV file path.');
    process.exit(1);
  }

  const rawBuffer = await fs.readFile(filePath);
  const rawBytes = new Uint8Array(rawBuffer);
  const inputHash = await sha256Hex(rawBytes);

  let parsed, encodingReport, selectedEncoding, dialect;
  if (isXlsxBytes(rawBytes)) {
    const wb = await readXlsxWorkbook(rawBytes, { sheetName: getFlag(args, '--sheet', undefined) });
    parsed = { headers: wb.headers, rows: wb.rows, parseErrors: [] };
    encodingReport = { recommended: 'xlsx-utf8', bom: null };
    selectedEncoding = 'xlsx-utf8';
    dialect = { delimiter: ',', delimiterLabel: `XLSX (${wb.activeSheet})` };
  } else {
    encodingReport = detectEncodingCandidates(rawBytes);
    selectedEncoding = getFlag(args, '--encoding', encodingReport.recommended);
  const decoded = decodeBytes(rawBytes, selectedEncoding);
    dialect = detectDialect(decoded.text);
  const previewParse = parseCsv(decoded.text, {
    delimiter: dialect.delimiter,
    quoteChar: dialect.quoteChar,
    hasHeader: false,
    maxRows: 12,
  });
  const headerInfo = detectHeaderRow(
    previewParse.rows[0]?.cells || [],
    previewParse.rows.slice(1).map((r) => r.cells)
  );
    parsed = parseCsv(decoded.text, {
      delimiter: dialect.delimiter,
      quoteChar: dialect.quoteChar,
      hasHeader: headerInfo.hasHeader,
    });
  }

  const diag = runDiagnostics({
    headers: parsed.headers,
    rows: parsed.rows,
    parseErrors: parsed.parseErrors,
    encodingReport,
    dialectReport: dialect,
    fileSizeBytes: rawBytes.length,
  });

  if (cmd === 'diagnose') {
    if (args.includes('--agent')) {
      const compact = await csvInspect({ filePath, encoding: getFlag(args, '--encoding', undefined) });
      console.log(JSON.stringify(compact, null, 2));
      return;
    }
    if (args.includes('--json')) {
      console.log(JSON.stringify({ file: path.basename(filePath), inputHash, encodingReport, dialect, diag }, null, 2));
      return;
    }
    console.log(`\nCSV Rescue Health Report — ${path.basename(filePath)} (${formatBytes(rawBytes.length)})`);
    console.log(`Encoding: ${selectedEncoding} | Delimiter: ${dialect.delimiterLabel} | Rows: ${diag.summary.totalRows} | Columns: ${diag.summary.totalColumns}`);
    console.log(`Issues: ${diag.summary.totalIssues} | Affected rows: ${diag.summary.affectedRowCount} | Needs review: ${diag.summary.needsReviewCount}\n`);
    for (const iss of diag.issues) {
      console.log(`[${iss.severity.toUpperCase()}] ${iss.title} (${iss.affectedCount} affected)`);
      console.log(`  ${iss.explanation}`);
    }
    return;
  }

  if (cmd === 'clean') {
    const outPath = getFlag(args, '--out');
    if (!outPath) {
      console.error('Error: --out <path> is required for clean command.');
      process.exit(1);
    }

    let table = { headers: parsed.headers, rows: parsed.rows };
    const appliedRules = [];
    const runAndRecord = (ruleId, params = {}) => {
      const res = executeRule(table, { ruleId, params });
      table = res.nextTable;
      appliedRules.push(res);
    };

    if (args.includes('--remove-blanks')) runAndRecord('remove_blank_rows');
    if (args.includes('--remove-rep-headers')) runAndRecord('remove_repeated_headers');
    if (args.includes('--trim')) runAndRecord('trim_whitespace');
    if (args.includes('--dedupe')) runAndRecord('deduplicate_exact');

    const format = getFlag(args, '--format', 'csv-bom');
    const validFormats = ['csv-bom', 'csv', 'tsv', 'json', 'excel-xml', 'custom'];
    if (!validFormats.includes(format)) {
      console.error(`Error: Unsupported --format "${format}". Valid formats: ${validFormats.join(', ')}`);
      process.exit(1);
    }
    const customDelimiter = getFlag(args, '--delimiter', ';');
    const formulaProtection = getFlag(args, '--formula-protect', 'none');

    const exported = await buildSafeExport(table, { format, customDelimiter, formulaProtection });
    const postDiag = runDiagnostics({ headers: table.headers, rows: table.rows });
    const outDelimiterLabel = format === 'tsv' ? 'Tab (\\t)' : format === 'custom' ? customDelimiter : format === 'json' ? 'JSON' : 'Comma (,)';
    await fs.writeFile(outPath, exported.bytes);

    const ledger = buildIntegrityLedger({
      originalRowCount: parsed.rows.length,
      currentRowCount: table.rows.length,
      originalColCount: parsed.headers.length,
      currentColCount: table.headers.length,
      originalBytesLength: rawBytes.length,
      outputBytesLength: exported.byteLength,
      appliedRules,
      unresolvedCount: postDiag.uncertaintyItems.length,
      autoFixedCount: appliedRules.reduce((a, r) => a + r.affectedRows, 0),
      userConfirmedCount: 0,
      keptOriginalCount: 0,
      encoding: selectedEncoding,
      delimiter: dialect.delimiter,
      inputHash,
      outputHash: exported.outputHash,
    });

    const receiptPath = getFlag(args, '--receipt');
    if (receiptPath) {
      const receipt = generateRepairReceipt({
        fileName: path.basename(filePath),
        inputHash,
        outputHash: exported.outputHash,
        encoding: selectedEncoding,
        delimiter: outDelimiterLabel,
        exportFormat: format,
        formulaProtectionMode: formulaProtection,
        formulaProtectedCount: exported.formulaProtectedCount,
        ledger,
        appliedRules,
        unresolvedItems: postDiag.uncertaintyItems,
      });
      if (receiptPath.endsWith('.html')) {
        await fs.writeFile(receiptPath, receipt.html, 'utf-8');
      } else {
        await fs.writeFile(receiptPath, JSON.stringify(receipt.json, null, 2), 'utf-8');
      }
    }

    console.log(`Cleaned file written to ${outPath}`);
    console.log(`Rows: ${parsed.rows.length} -> ${table.rows.length} | Output SHA-256: ${exported.outputHash.slice(0, 16)}...`);
    return;
  }

  printHelp();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
