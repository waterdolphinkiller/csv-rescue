/**
 * @fileoverview CSV Rescue AI-Friendly Agent API (v2.1).
 *
 * Designed specifically for AI Agents & LLM tool calling:
 * - Token-efficient compact responses (strictly bounded sample counts — safe on 100k+ row files!)
 * - Column name OR 0-based index resolution (AI passes "email" instead of counting columns)
 * - Declarative JSON pipeline with pure `dryRun` preview before writing any file
 * - Self-Healing structured errors (`validRuleIds`, `validColumns`, `closestMatch`, `exampleStep`)
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { sha256Hex, encodeUtf8, CSV_RESCUE_VERSION } from '../shared-types/index.mjs';
import { defaultRegistry, validateRuleParams } from '../plugin-registry/index.mjs';
import { detectEncodingCandidates, decodeBytes } from '../encoding-detector/index.mjs';
import { detectDialect, detectHeaderRow } from '../dialect-detector/index.mjs';
import { parseCsv, parseCsvStream } from '../csv-parser/index.mjs';
import { isXlsxBytes, readXlsxWorkbook } from '../xlsx-reader/index.mjs';
import { diagnoseCsvFileStreaming } from '../streaming-engine/index.mjs';
import { runDiagnostics } from '../diagnostic-engine/index.mjs';
import { executeRule } from '../repair-rules/index.mjs';
import { buildIntegrityLedger, diffCsvTables, inspectBatchAlignment, mergeBatchFiles } from '../quality-profile/index.mjs';
import { buildSafeExport, generateRepairReceipt, generateHumanReviewHtml } from '../export-engine/index.mjs';

export const BUILTIN_RULE_IDS = [
  'trim_whitespace',
  'remove_blank_rows',
  'remove_repeated_headers',
  'dedupe_header_names',
  'deduplicate_exact',
  'deduplicate_by_key',
  'lowercase_column',
  'uppercase_column',
  'titlecase_column',
  'normalize_dates',
  'normalize_phone',
  'preserve_leading_zeros',
  'normalize_currency',
  'standardize_empty_values',
  'repair_broken_rows_suggested',
  'rename_column',
  'split_column',
  'merge_columns',
  'update_row_cells',
  'exclude_row',
];

const COLUMN_PARAM_KEYS = ['column', 'columnA', 'columnB', 'dateColumn'];

/**
 * Standard JSON Schemas for MCP Server & LLM Function Calling.
 */
export const AGENT_TOOL_SCHEMAS = [
  {
    name: 'csv_inspect',
    description:
      'Inspect a local CSV/TSV file or raw CSV text and return a compact, token-efficient Health Report with column profiles, detected issues, uncertainty count, and a ready-to-run suggestedSafePipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute or relative path to a local CSV/TSV file.' },
        csvText: { type: 'string', description: 'Inline CSV text (used if filePath is omitted).' },
        encoding: { type: 'string', description: 'Optional encoding override (e.g. utf-8, utf-8-bom, windows-1252, gb18030).' },
        delimiter: { type: 'string', description: 'Optional delimiter override (",", ";", "\\t", "|").' },
        sheetName: { type: 'string', description: 'Optional sheet name when reading a native .xlsx Excel workbook.' },
        maxSamples: { type: 'number', description: 'Max sample items per section (default 5, max 20).' },
      },
    },
  },
  {
    name: 'csv_preview_pipeline',
    description:
      'Dry-run a declarative JSON cleaning pipeline without modifying any file on disk. Accepts column names (e.g. "email") or 0-based indices. Returns per-step affected row counts, Before/After samples, and self-healing hints if any rule or column is invalid.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to local CSV/TSV file.' },
        csvText: { type: 'string', description: 'Inline CSV text (alternative to filePath).' },
        rules: {
          type: 'array',
          description: 'Ordered list of cleaning rules to preview.',
          items: {
            type: 'object',
            properties: {
              ruleId: { type: 'string', description: 'Rule ID (e.g. trim_whitespace, remove_blank_rows, lowercase_column, normalize_dates, normalize_phone, deduplicate_by_key).' },
              params: { type: 'object', description: 'Rule parameters; column fields accept column names or indices.' },
            },
            required: ['ruleId'],
          },
        },
        maxSamples: { type: 'number', description: 'Max Before/After samples per step (default 5).' },
      },
      required: ['rules'],
    },
  },
  {
    name: 'csv_execute_pipeline',
    description:
      'Execute a validated cleaning pipeline and safely export the result (CSV UTF-8 BOM, CSV, TSV, JSON, or Excel XML) with optional OWASP CSV Formula Injection protection and a privacy-safe Repair Receipt (SHA-256 hashes, zero raw cell leakage).',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to input CSV/TSV file.' },
        csvText: { type: 'string', description: 'Inline CSV text (alternative to filePath).' },
        rules: {
          type: 'array',
          description: 'Ordered list of cleaning rules to execute.',
          items: {
            type: 'object',
            properties: {
              ruleId: { type: 'string' },
              params: { type: 'object' },
            },
            required: ['ruleId'],
          },
        },
        outPath: { type: 'string', description: 'Destination path to write the cleaned file.' },
        format: {
          type: 'string',
          enum: ['csv-bom', 'csv', 'tsv', 'json', 'excel-xml', 'custom'],
          description: 'Export format (default csv-bom for Excel compatibility).',
        },
        customDelimiter: { type: 'string', description: 'Used when format is "custom".' },
        formulaProtection: {
          type: 'string',
          enum: ['prefix_quote', 'prefix_tab', 'none'],
          description: 'OWASP formula injection protection mode (default prefix_quote).',
        },
        receiptPath: { type: 'string', description: 'Optional path to write privacy-safe Repair Receipt (.json or .html).' },
        reviewHtmlPath: { type: 'string', description: 'Optional path to generate a self-contained offline HTML Human-in-the-Loop Review Page for remaining uncertain rows.' },
      },
      required: ['rules'],
    },
  },
  {
    name: 'csv_diff_or_merge',
    description:
      'Compare two CSV files by primary key ("diff") or check schema alignment and merge multiple CSV files with optional cross-file deduplication ("merge").',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['diff', 'merge'], description: 'Operation mode.' },
        filePaths: { type: 'array', items: { type: 'string' }, description: 'List of 2+ local CSV file paths.' },
        csvTexts: { type: 'array', items: { type: 'string' }, description: 'Inline CSV texts (alternative to filePaths).' },
        keyColumn: { description: 'Column name or 0-based index for diff mode (default 0).' },
        dedupeKey: { type: 'string', description: 'Optional column name for cross-file deduplication in merge mode.' },
        includeSourceColumn: { type: 'boolean', description: 'Add _source_file column in merge mode (default true).' },
        outPath: { type: 'string', description: 'Optional output path for merged CSV.' },
        maxSamples: { type: 'number', description: 'Max diff/conflict samples to return (default 10).' },
      },
      required: ['mode'],
    },
  },
];

/**
 * Find closest matching string for self-healing error suggestions.
 */
function findClosest(input, candidates) {
  const low = String(input || '').toLowerCase();
  return (
    candidates.find((c) => c.toLowerCase() === low) ||
    candidates.find((c) => c.toLowerCase().includes(low) || low.includes(c.toLowerCase())) ||
    candidates[0] ||
    null
  );
}

/**
 * Resolve a column name or 0-based index against current headers.
 */
export function resolveColumnRef(colRef, headers) {
  if (typeof colRef === 'number' && Number.isInteger(colRef)) {
    if (colRef >= 0 && colRef < headers.length) return { ok: true, index: colRef };
    return {
      ok: false,
      error: `Column index ${colRef} is out of range (0..${headers.length - 1}).`,
      suggestion: headers[0] || null,
    };
  }
  if (typeof colRef === 'string') {
    const trimmed = colRef.trim();
    const exactIdx = headers.findIndex((h) => h === trimmed);
    if (exactIdx >= 0) return { ok: true, index: exactIdx };
    const ciIdx = headers.findIndex((h) => h.toLowerCase() === trimmed.toLowerCase());
    if (ciIdx >= 0) return { ok: true, index: ciIdx };
    return {
      ok: false,
      error: `Column "${colRef}" not found.`,
      suggestion: findClosest(colRef, headers),
    };
  }
  return { ok: false, error: 'Invalid column reference.', suggestion: headers[0] || null };
}


/**
 * Security Sandbox: verifies a file path resolves inside at least one allowed directory.
 * Prevents path traversal (../) when MCP Server is run with --allow-dir.
 * @param {string} targetPath
 * @param {string[] | null | undefined} allowedDirs
 */
function resolveRealOrAncestor(p) {
  let cur = path.resolve(p);
  const tail = [];
  while (true) {
    try {
      const real = fsSync.realpathSync(cur);
      return tail.length ? path.join(real, ...tail.reverse()) : real;
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return path.resolve(p);
      tail.push(path.basename(cur));
      cur = parent;
    }
  }
}

export function assertPathAllowed(targetPath, allowedDirs) {
  if (!allowedDirs || allowedDirs.length === 0) return { ok: true };
  const resolved = resolveRealOrAncestor(targetPath);
  for (const dir of allowedDirs) {
    const base = resolveRealOrAncestor(dir);
    if (resolved === base || resolved.startsWith(base + path.sep)) {
      return { ok: true };
    }
  }
  return {
    ok: false,
    errorCode: 'PATH_OUTSIDE_SANDBOX',
    message: `Access denied: "${targetPath}" resolves outside allowed directories.`,
    selfHealing: {
      allowedDirs: allowedDirs.map((d) => path.resolve(d)),
      hint: 'Use a path inside one of the allowedDirs configured via --allow-dir.',
    },
  };
}

async function loadInputSource({ filePath, csvText, encoding, delimiter, allowedDirs }) {
  let rawBytes;
  let fileName = 'inline.csv';
  if (filePath) {
    const guard = assertPathAllowed(filePath, allowedDirs);
    if (!guard.ok) return guard;
    const buf = await fs.readFile(filePath);
    rawBytes = new Uint8Array(buf);
    fileName = path.basename(filePath);
  } else if (typeof csvText === 'string') {
    rawBytes = encodeUtf8(csvText);
  } else {
    return {
      ok: false,
      errorCode: 'MISSING_INPUT',
      message: 'Provide either "filePath" or "csvText".',
      selfHealing: { examplePayload: { filePath: 'fixtures/malformed/broken_orders.csv' } },
    };
  }

  const inputHash = await sha256Hex(rawBytes);

  // Native .xlsx workbook support (zero-dependency)
  if (isXlsxBytes(rawBytes)) {
    const wb = await readXlsxWorkbook(rawBytes, { sheetName: arguments[0]?.sheetName });
    return {
      ok: true,
      fileName,
      rawBytes,
      inputHash,
      isXlsx: true,
      sheetNames: wb.sheetNames,
      activeSheet: wb.activeSheet,
      encodingReport: { bom: null, recommended: 'xlsx-utf8', hasPreexistingReplacementChars: false, candidates: [] },
      selectedEncoding: 'xlsx-utf8',
      dialectReport: { delimiter: ',', delimiterLabel: 'XLSX Sheet', expectedColumns: wb.headers.length },
      selectedDelimiter: ',',
      parsed: { headers: wb.headers, rows: wb.rows, parseErrors: [], totalRawLines: wb.totalRawLines },
    };
  }

  const encodingReport = detectEncodingCandidates(rawBytes);
  const selectedEncoding = encoding || encodingReport.recommended;
  const decoded = decodeBytes(rawBytes, selectedEncoding);
  const dialectReport = detectDialect(decoded.text);
  const selectedDelimiter = delimiter || dialectReport.delimiter;

  const preview = parseCsv(decoded.text, { delimiter: selectedDelimiter, hasHeader: false, maxRows: 12 });
  const headerInfo = detectHeaderRow(
    preview.rows[0]?.cells || [],
    preview.rows.slice(1).map((r) => r.cells)
  );
  const parsed = await parseCsvStream(decoded.text, {
    delimiter: selectedDelimiter,
    hasHeader: headerInfo.hasHeader,
  });

  return {
    ok: true,
    fileName,
    rawBytes,
    inputHash,
    encodingReport,
    selectedEncoding,
    dialectReport,
    selectedDelimiter,
    parsed,
  };
}

/**
 * Tool 1: Compact, token-efficient CSV inspection for AI Agents.
 */
export async function csvInspect(args = {}) {
  const maxSamples = Math.max(1, Math.min(20, Number(args.maxSamples ?? 5)));
  if (args.filePath && !args.filePath.toLowerCase().endsWith('.xlsx')) {
    const guard = assertPathAllowed(args.filePath, args.allowedDirs);
    if (!guard.ok) return guard;
    try {
      const st = await fs.stat(args.filePath);
      if (st.size > 15 * 1024 * 1024) {
        return await diagnoseCsvFileStreaming(args.filePath, {
          encoding: args.encoding,
          delimiter: args.delimiter,
          maxSamples,
        });
      }
    } catch { /* fall through to loadInputSource */ }
  }
  const loaded = await loadInputSource(args);
  if (!loaded.ok) return loaded;

  const diag = runDiagnostics({
    headers: loaded.parsed.headers,
    rows: loaded.parsed.rows,
    parseErrors: loaded.parsed.parseErrors,
    encodingReport: loaded.encodingReport,
    dialectReport: loaded.dialectReport,
    fileSizeBytes: loaded.rawBytes.length,
  });

  const suggestedSafePipeline = [];
  for (const iss of diag.issues) {
    const safeAct = (iss.suggestedActions || []).find(
      (a) => a.risk === 'low' && BUILTIN_RULE_IDS.includes(a.ruleId)
    );
    if (safeAct) {
      suggestedSafePipeline.push({
        ruleId: safeAct.ruleId,
        params: safeAct.params || {},
      });
    }
  }

  return {
    ok: true,
    toolVersion: CSV_RESCUE_VERSION,
    file: {
      name: loaded.fileName,
      bytes: loaded.rawBytes.length,
      sha256: loaded.inputHash,
      encoding: loaded.selectedEncoding,
      bom: loaded.encodingReport.bom,
      hasIrreversibleReplacementChars: loaded.encodingReport.hasPreexistingReplacementChars,
      delimiter: loaded.selectedDelimiter,
      rows: diag.summary.totalRows,
      columns: diag.summary.totalColumns,
      isXlsx: Boolean(loaded.isXlsx),
      sheetNames: loaded.sheetNames || undefined,
      activeSheet: loaded.activeSheet || undefined,
    },
    columns: diag.columnProfiles.map((c) => ({
      index: c.index,
      name: c.name,
      type: c.inferredType,
      nullRate: c.nullRate,
      sensitive: c.sensitiveType,
      samples: c.samples.slice(0, 3),
    })),
    summary: {
      totalIssues: diag.summary.totalIssues,
      affectedRowCount: diag.summary.affectedRowCount,
      uncertaintyQueueCount: diag.summary.needsReviewCount,
      formulaSensitiveCells: diag.summary.formulaHitCount,
    },
    issues: diag.issues.map((iss) => ({
      code: iss.code,
      severity: iss.severity,
      category: iss.category,
      column: iss.columnName ?? null,
      affectedCount: iss.affectedCount,
      title: iss.title,
      explanation: iss.explanation,
      sampleBefore: iss.sampleBefore ?? null,
      sampleAfter: iss.sampleAfter ?? null,
      requiresConfirmation: iss.requiresConfirmation,
      suggestedRules: (iss.suggestedActions || [])
        .filter((a) => BUILTIN_RULE_IDS.includes(a.ruleId))
        .map((a) => ({ ruleId: a.ruleId, params: a.params || {}, risk: a.risk, label: a.label })),
    })),
    uncertaintySamples: diag.uncertaintyItems.slice(0, maxSamples).map((u) => ({
      rowNumber: u.rowNumber,
      sourceLine: u.sourceLine,
      issueCode: u.issueCode,
      reason: u.reason,
      hasCandidateFix: Boolean(u.candidateFix),
    })),
    suggestedSafePipeline,
  };
}

/**
 * Resolve & validate all steps in a pipeline; returns Self-Healing error if anything is wrong.
 */
function resolveAndValidateStep(step, stepIndex, headers, registry = defaultRegistry) {
  const allValidRuleIds = [...BUILTIN_RULE_IDS, ...registry.listRules().map((r) => r.id)];
  if (!step || !step.ruleId || !allValidRuleIds.includes(step.ruleId)) {
    return {
      ok: false,
      errorCode: 'INVALID_RULE_ID',
      failedStepIndex: stepIndex,
      message: `Unknown ruleId "${step?.ruleId}".`,
      selfHealing: {
        closestMatch: findClosest(step?.ruleId, allValidRuleIds),
        validRuleIds: allValidRuleIds,
        exampleStep: { ruleId: 'trim_whitespace', params: {} },
      },
    };
  }

  const resolvedParams = { ...(step.params || {}) };
  for (const key of COLUMN_PARAM_KEYS) {
    if (resolvedParams[key] !== undefined && resolvedParams[key] !== null) {
      const colCheck = resolveColumnRef(resolvedParams[key], headers);
      if (!colCheck.ok) {
        return {
          ok: false,
          errorCode: 'INVALID_COLUMN',
          failedStepIndex: stepIndex,
          message: `Step ${stepIndex} (${step.ruleId}) parameter "${key}": ${colCheck.error}`,
          selfHealing: {
            closestMatch: colCheck.suggestion,
            validColumns: headers,
            exampleStep: {
              ruleId: step.ruleId,
              params: { ...step.params, [key]: colCheck.suggestion || 0 },
            },
          },
        };
      }
      resolvedParams[key] = colCheck.index;
    }
  }

  const customPlugin = registry.getRule(step.ruleId);
  if (customPlugin) {
    const val = validateRuleParams(resolvedParams, customPlugin.schema);
    if (!val.valid) {
      return {
        ok: false,
        errorCode: 'INVALID_RULE_PARAMS',
        failedStepIndex: stepIndex,
        message: val.errors.join('; '),
        selfHealing: { schema: customPlugin.schema, validColumns: headers },
      };
    }
  }

  return { ok: true, rule: { ruleId: step.ruleId, params: resolvedParams } };
}

/**
 * Tool 2: Pure dry-run pipeline preview (never writes to disk).
 */
export async function csvPreviewPipeline(args = {}) {
  const maxSamples = Math.max(1, Math.min(20, Number(args.maxSamples ?? 5)));
  if (!Array.isArray(args.rules)) {
    return {
      ok: false,
      errorCode: 'INVALID_RULES_ARRAY',
      message: '"rules" must be an array of { ruleId, params } objects.',
      selfHealing: { examplePayload: { rules: [{ ruleId: 'trim_whitespace', params: {} }] } },
    };
  }

  const loaded = await loadInputSource(args);
  if (!loaded.ok) return loaded;

  let table = { headers: loaded.parsed.headers.slice(), rows: loaded.parsed.rows };
  const rowsBefore = table.rows.length;
  const stepReports = [];

  for (let i = 0; i < args.rules.length; i++) {
    const check = resolveAndValidateStep(args.rules[i], i, table.headers);
    if (!check.ok) return check;
    const res = executeRule(table, check.rule, { mutateInPlace: true });
    table = res.nextTable;
    stepReports.push({
      step: i + 1,
      ruleId: res.ruleId,
      description: res.description,
      affectedRows: res.affectedRows,
      affectedCells: res.affectedCells,
      removedRows: res.removedRows,
      samples: res.samples.slice(0, maxSamples),
    });
  }

  const afterDiag = runDiagnostics({ headers: table.headers, rows: table.rows });

  return {
    ok: true,
    dryRun: true,
    file: loaded.fileName,
    rowsBefore,
    rowsAfter: table.rows.length,
    columnsAfter: table.headers,
    steps: stepReports,
    remainingIssuesCount: afterDiag.summary.totalIssues,
    remainingUncertaintyCount: afterDiag.summary.needsReviewCount,
  };
}

/**
 * Tool 3: Execute validated pipeline, safely export, and optionally emit privacy-safe Repair Receipt.
 */
export async function csvExecutePipeline(args = {}) {
  if (!Array.isArray(args.rules)) {
    return {
      ok: false,
      errorCode: 'INVALID_RULES_ARRAY',
      message: '"rules" must be an array of { ruleId, params } objects.',
      selfHealing: { examplePayload: { rules: [{ ruleId: 'trim_whitespace', params: {} }] } },
    };
  }

  const loaded = await loadInputSource(args);
  if (!loaded.ok) return loaded;

  let table = { headers: loaded.parsed.headers.slice(), rows: loaded.parsed.rows };
  const rowsBefore = table.rows.length;
  const colsBefore = table.headers.length;
  const appliedRules = [];

  for (let i = 0; i < args.rules.length; i++) {
    const check = resolveAndValidateStep(args.rules[i], i, table.headers);
    if (!check.ok) return check;
    const res = executeRule(table, check.rule, { mutateInPlace: true });
    table = res.nextTable;
    appliedRules.push({
      ruleId: res.ruleId,
      description: res.description,
      affectedRows: res.affectedRows,
      affectedCells: res.affectedCells,
      removedRows: res.removedRows,
    });
  }

  const format = args.format || 'csv-bom';
  const formulaProtection = args.formulaProtection || 'prefix_quote';
  const exported = await buildSafeExport(table, {
    format,
    customDelimiter: args.customDelimiter,
    formulaProtection,
  });

  for (const writePath of [args.outPath, args.receiptPath, args.reviewHtmlPath]) {
    if (writePath) {
      const guard = assertPathAllowed(writePath, args.allowedDirs);
      if (!guard.ok) return guard;
    }
  }

  if (args.outPath) {
    await fs.mkdir(path.dirname(path.resolve(args.outPath)), { recursive: true });
    await fs.writeFile(args.outPath, exported.bytes);
  }

  const afterDiag = runDiagnostics({ headers: table.headers, rows: table.rows });
  const ledger = buildIntegrityLedger({
    originalRowCount: rowsBefore,
    currentRowCount: table.rows.length,
    originalColCount: colsBefore,
    currentColCount: table.headers.length,
    originalBytesLength: loaded.rawBytes.length,
    outputBytesLength: exported.byteLength,
    appliedRules,
    unresolvedCount: afterDiag.uncertaintyItems.length,
    autoFixedCount: appliedRules.reduce((a, r) => a + r.affectedRows, 0),
    userConfirmedCount: 0,
    keptOriginalCount: 0,
    encoding: loaded.selectedEncoding,
    delimiter: loaded.selectedDelimiter,
    inputHash: loaded.inputHash,
    outputHash: exported.outputHash,
  });

  const receipt = generateRepairReceipt({
    fileName: loaded.fileName,
    inputHash: loaded.inputHash,
    outputHash: exported.outputHash,
    encoding: format === 'csv-bom' ? 'utf-8-bom' : 'utf-8',
    delimiter: format === 'tsv' ? '\t' : format === 'custom' ? (args.customDelimiter || ';') : format === 'json' ? 'JSON' : ',',
    exportFormat: format,
    formulaProtectionMode: formulaProtection,
    formulaProtectedCount: exported.formulaProtectedCount,
    ledger,
    appliedRules,
    unresolvedItems: afterDiag.uncertaintyItems,
  });

  if (args.receiptPath) {
    await fs.mkdir(path.dirname(path.resolve(args.receiptPath)), { recursive: true });
    if (args.receiptPath.endsWith('.html')) {
      await fs.writeFile(args.receiptPath, receipt.html, 'utf-8');
    } else {
      await fs.writeFile(args.receiptPath, JSON.stringify(receipt.json, null, 2), 'utf-8');
    }
  }

  let humanReviewGenerated = false;
  if (args.reviewHtmlPath) {
    const reviewHtml = generateHumanReviewHtml({
      fileName: loaded.fileName,
      headers: table.headers,
      appliedRules,
      uncertaintyItems: afterDiag.uncertaintyItems,
      rowsBefore,
      rowsAfter: table.rows.length,
      outputPath: args.outPath || null,
    });
    await fs.mkdir(path.dirname(path.resolve(args.reviewHtmlPath)), { recursive: true });
    await fs.writeFile(args.reviewHtmlPath, reviewHtml, 'utf-8');
    humanReviewGenerated = true;
  }

  return {
    ok: true,
    outputPath: args.outPath || null,
    receiptPath: args.receiptPath || null,
    reviewHtmlPath: humanReviewGenerated ? args.reviewHtmlPath : null,
    uncertaintyQueueCount: afterDiag.uncertaintyItems.length,
    format,
    inputSha256: loaded.inputHash,
    outputSha256: exported.outputHash,
    bytesWritten: exported.byteLength,
    rowsBefore,
    rowsAfter: table.rows.length,
    cellsModified: ledger.cellsModifiedTotal,
    formulaProtectedCells: exported.formulaProtectedCount,
    remainingIssuesCount: afterDiag.summary.totalIssues,
    receiptSummary: receipt.json.summary,
    // Include inline outputText only when not written to disk and under 50KB to protect LLM context
    outputText: !args.outPath && exported.text.length <= 50000 ? exported.text : undefined,
  };
}

/**
 * Tool 4: Compact CSV Diff or Multi-File Schema-Safe Merge.
 */
export async function csvDiffOrMerge(args = {}) {
  const mode = args.mode;
  const maxSamples = Math.max(1, Math.min(30, Number(args.maxSamples ?? 10)));
  if (mode !== 'diff' && mode !== 'merge') {
    return {
      ok: false,
      errorCode: 'INVALID_MODE',
      message: 'mode must be "diff" or "merge".',
      selfHealing: { validModes: ['diff', 'merge'] },
    };
  }

  const sources = [];
  if (Array.isArray(args.filePaths) && args.filePaths.length >= 2) {
    for (const fp of args.filePaths) {
      const loaded = await loadInputSource({ filePath: fp, allowedDirs: args.allowedDirs });
      if (!loaded.ok) return loaded;
      sources.push({ fileName: loaded.fileName, headers: loaded.parsed.headers, rows: loaded.parsed.rows });
    }
  } else if (Array.isArray(args.csvTexts) && args.csvTexts.length >= 2) {
    for (let i = 0; i < args.csvTexts.length; i++) {
      const loaded = await loadInputSource({ csvText: args.csvTexts[i] });
      if (!loaded.ok) return loaded;
      sources.push({ fileName: `input_${i + 1}.csv`, headers: loaded.parsed.headers, rows: loaded.parsed.rows });
    }
  } else {
    return {
      ok: false,
      errorCode: 'INSUFFICIENT_FILES',
      message: 'Provide at least 2 entries in "filePaths" or "csvTexts".',
    };
  }

  if (mode === 'diff') {
    let keyIdx = 0;
    if (args.keyColumn !== undefined && args.keyColumn !== null) {
      const check = resolveColumnRef(args.keyColumn, sources[0].headers);
      if (!check.ok) {
        return {
          ok: false,
          errorCode: 'INVALID_COLUMN',
          message: check.error,
          selfHealing: { validColumns: sources[0].headers, closestMatch: check.suggestion },
        };
      }
      keyIdx = check.index;
    }
    const diff = diffCsvTables(sources[0], sources[1], keyIdx);
    return {
      ok: true,
      mode: 'diff',
      keyColumn: diff.keyColumn,
      headerDiff: diff.headerDiff,
      summary: diff.summary,
      samples: {
        added: diff.added.slice(0, maxSamples),
        removed: diff.removed.slice(0, maxSamples),
        modified: diff.modified.slice(0, maxSamples),
      },
    };
  }

  // Merge mode
  const alignment = inspectBatchAlignment(sources);
  const merged = mergeBatchFiles(sources, {
    dedupeKey: args.dedupeKey || '',
    includeSourceColumn: args.includeSourceColumn !== false,
  });

  let outputHash = null;
  if (args.outPath) {
    const guard = assertPathAllowed(args.outPath, args.allowedDirs);
    if (!guard.ok) return guard;
    const exported = await buildSafeExport(
      { headers: merged.headers, rows: merged.rows },
      { format: 'csv-bom', formulaProtection: 'prefix_quote' }
    );
    await fs.mkdir(path.dirname(path.resolve(args.outPath)), { recursive: true });
    await fs.writeFile(args.outPath, exported.bytes);
    outputHash = exported.outputHash;
  }

  return {
    ok: true,
    mode: 'merge',
    fileCount: alignment.fileCount,
    isSchemaIdentical: alignment.isSchemaIdentical,
    schemaConflicts: alignment.schemaConflicts.slice(0, maxSamples),
    mergedHeaders: merged.headers,
    totalOutputRows: merged.rows.length,
    crossFileDuplicatesRemoved: merged.crossFileDuplicatesRemoved,
    outPath: args.outPath || null,
    outputSha256: outputHash,
  };
}
