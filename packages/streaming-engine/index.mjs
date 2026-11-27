/**
 * @fileoverview O(1) Constant-Memory Disk-Streaming CSV Diagnostics Engine (v2.3).
 * Designed for 50MB–500MB+ CSV files in Node.js CLI & MCP Server without loading
 * millions of row objects into heap RAM.
 */

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { detectEncodingCandidates, decodeBytes } from '../encoding-detector/index.mjs';
import { detectDialect } from '../dialect-detector/index.mjs';
import { isFormulaSensitive } from '../diagnostic-engine/index.mjs';
import { CSV_RESCUE_VERSION } from '../shared-types/index.mjs';

function parseLineFast(line, delimiter, quoteChar = '"') {
  const cells = [];
  const len = line.length;
  let cur = '';
  let inQ = false;
  let fieldStart = true;
  let strayQuote = false;

  for (let i = 0; i < len; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === quoteChar) {
        if (i + 1 < len && line[i + 1] === quoteChar) {
          cur += quoteChar;
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === quoteChar && (fieldStart || cur.trim() === '')) {
        cur = '';
        inQ = true;
        fieldStart = false;
      } else if (ch === quoteChar) {
        strayQuote = true;
        cur += ch;
      } else if (ch === delimiter) {
        cells.push(cur);
        cur = '';
        fieldStart = true;
      } else {
        cur += ch;
        fieldStart = false;
      }
    }
  }
  cells.push(cur);
  return { cells, unclosedQuote: inQ, strayQuote };
}

/**
 * Stream-diagnose a huge CSV file (50MB–500MB+) in O(1) constant memory.
 * Computes exact SHA-256 hash, row count, structural anomalies, formula hits,
 * whitespace counts, and bounded samples without holding all rows in RAM.
 *
 * @param {string} filePath
 * @param {{ encoding?: string, delimiter?: string, maxSamples?: number }} [options]
 */
export async function diagnoseCsvFileStreaming(filePath, options = {}) {
  const maxSamples = Math.max(1, Math.min(20, Number(options.maxSamples ?? 5)));
  const stat = await fs.promises.stat(filePath);
  const fileSizeBytes = stat.size;

  // Step 1: Read first 32KB sample for encoding & dialect detection
  const fd = await fs.promises.open(filePath, 'r');
  const headBuf = Buffer.alloc(Math.min(32768, fileSizeBytes));
  await fd.read(headBuf, 0, headBuf.length, 0);
  await fd.close();

  const headBytes = new Uint8Array(headBuf.buffer, headBuf.byteOffset, headBuf.byteLength);
  const encodingReport = detectEncodingCandidates(headBytes);
  const selectedEncoding = options.encoding || encodingReport.recommended;
  const headDecoded = decodeBytes(headBytes, selectedEncoding);
  const dialectReport = detectDialect(headDecoded.text);
  const delimiter = options.delimiter || dialectReport.delimiter;

  // Step 2: Stream the entire file in 256KB chunks with O(1) memory
  const hash = createHash('sha256');
  const decoder = new TextDecoder(
    selectedEncoding === 'utf-8-bom' ? 'utf-8' : selectedEncoding,
    { fatal: false }
  );

  let headers = null;
  let headerSig = '';
  let expectedCols = 0;
  let totalRows = 0;
  let blankRows = 0;
  let repeatedHeaders = 0;
  let widthMismatches = 0;
  let quoteErrors = 0;
  let whitespaceRows = 0;
  let formulaHits = 0;
  let colNullCounts = [];
  let colSamples = [];
  const uncertaintySamples = [];
  let firstFormulaSample = null;
  let firstWidthSample = null;

  let leftover = '';
  let physicalLine = 0;
  let firstChunk = true;

  const processLine = (rawLine) => {
    physicalLine++;
    const cleanLine = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (physicalLine === 1 && cleanLine.charCodeAt(0) === 0xfeff) {
      // Strip UTF-8 BOM from first line
      return processLine(cleanLine.slice(1));
    }

    const parsed = parseLineFast(cleanLine, delimiter);
    if (headers === null) {
      headers = parsed.cells.map((h, i) => h.trim() || `column_${i + 1}`);
      expectedCols = headers.length;
      headerSig = headers.map((h) => h.toLowerCase()).join('|');
      colNullCounts = new Array(expectedCols).fill(0);
      colSamples = Array.from({ length: expectedCols }, () => []);
      return;
    }

    totalRows++;
    const cells = parsed.cells;
    let isBlank = true;
    let hasWs = false;

    for (let c = 0; c < cells.length; c++) {
      const val = cells[c];
      const trimmed = val.trim();
      if (trimmed !== '') isBlank = false;
      if (trimmed !== val) hasWs = true;
      if (c < expectedCols) {
        if (trimmed === '') colNullCounts[c]++;
        else if (colSamples[c].length < 3 && !colSamples[c].includes(trimmed)) {
          colSamples[c].push(trimmed);
        }
      }
      if (isFormulaSensitive(val)) {
        formulaHits++;
        if (!firstFormulaSample) firstFormulaSample = { row: totalRows, val };
      }
    }

    if (isBlank) {
      blankRows++;
      return;
    }
    if (hasWs) whitespaceRows++;

    if (cells.length !== expectedCols) {
      widthMismatches++;
      if (!firstWidthSample) firstWidthSample = { row: totalRows, found: cells.length };
      if (uncertaintySamples.length < maxSamples) {
        uncertaintySamples.push({
          rowNumber: totalRows,
          sourceLine: physicalLine,
          issueCode: 'ROW_WIDTH_MISMATCH',
          reason: `Found ${cells.length} fields instead of ${expectedCols}.`,
          hasCandidateFix: false,
        });
      }
    }

    if (parsed.unclosedQuote || parsed.strayQuote) {
      quoteErrors++;
      if (uncertaintySamples.length < maxSamples) {
        uncertaintySamples.push({
          rowNumber: totalRows,
          sourceLine: physicalLine,
          issueCode: 'QUOTE_ERROR',
          reason: parsed.unclosedQuote ? 'Unclosed quote' : 'Stray quote in unquoted field',
          hasCandidateFix: false,
        });
      }
    }

    if (cells.length === expectedCols) {
      let sig = '';
      for (let c = 0; c < expectedCols; c++) {
        if (c > 0) sig += '|';
        sig += cells[c].trim().toLowerCase();
      }
      if (sig === headerSig) repeatedHeaders++;
    }
  };

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });
    stream.on('data', (chunk) => {
      hash.update(chunk);
      let text = decoder.decode(chunk, { stream: true });
      if (firstChunk) {
        firstChunk = false;
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      }
      const combined = leftover + text;
      let start = 0;
      let nl;
      while ((nl = combined.indexOf('\n', start)) !== -1) {
        processLine(combined.slice(start, nl));
        start = nl + 1;
      }
      leftover = combined.slice(start);
    });
    stream.on('end', () => {
      const tail = leftover + decoder.decode();
      if (tail.length > 0) processLine(tail);
      resolve();
    });
    stream.on('error', reject);
  });

  const sha256 = hash.digest('hex');
  const issues = [];
  if (widthMismatches > 0) {
    issues.push({
      code: 'ROW_WIDTH_MISMATCH',
      severity: 'critical',
      category: 'structure',
      affectedCount: widthMismatches,
      title: 'Inconsistent row width (broken rows)',
      explanation: `${widthMismatches} row(s) do not match the expected ${expectedCols} columns (first at row ${firstWidthSample?.row}).`,
    });
  }
  if (quoteErrors > 0) {
    issues.push({
      code: 'QUOTE_ERROR',
      severity: 'critical',
      category: 'structure',
      affectedCount: quoteErrors,
      title: 'Malformed or unclosed quotes',
      explanation: `${quoteErrors} row(s) contain unclosed or stray quote characters.`,
    });
  }
  if (formulaHits > 0) {
    issues.push({
      code: 'FORMULA_INJECTION_RISK',
      severity: 'high',
      category: 'security',
      affectedCount: formulaHits,
      title: 'Possible spreadsheet formula cells (CSV Injection risk)',
      explanation: `${formulaHits} cell(s) start with =, +, -, or @ (first at row ${firstFormulaSample?.row}).`,
    });
  }
  if (repeatedHeaders > 0) {
    issues.push({
      code: 'REPEATED_HEADER_ROWS',
      severity: 'warning',
      category: 'structure',
      affectedCount: repeatedHeaders,
      title: 'Repeated header rows inside data',
      explanation: `${repeatedHeaders} row(s) repeat the header row.`,
    });
  }
  if (blankRows > 0) {
    issues.push({
      code: 'BLANK_ROWS',
      severity: 'info',
      category: 'structure',
      affectedCount: blankRows,
      title: 'Blank / empty rows',
      explanation: `${blankRows} blank row(s) found.`,
    });
  }
  if (whitespaceRows > 0) {
    issues.push({
      code: 'EXTRA_WHITESPACE',
      severity: 'info',
      category: 'columns',
      affectedCount: whitespaceRows,
      title: 'Extra leading/trailing whitespace',
      explanation: `${whitespaceRows} row(s) contain extra surrounding spaces.`,
    });
  }

  return {
    ok: true,
    mode: 'constant-memory-streaming',
    toolVersion: CSV_RESCUE_VERSION,
    file: {
      name: filePath.split(/[\\/]/).pop(),
      bytes: fileSizeBytes,
      sha256,
      encoding: selectedEncoding,
      bom: encodingReport.bom,
      delimiter,
      rows: totalRows,
      columns: expectedCols,
    },
    columns: (headers || []).map((name, i) => ({
      index: i,
      name,
      nullRate: totalRows > 0 ? Number((colNullCounts[i] / totalRows).toFixed(3)) : 0,
      samples: colSamples[i] || [],
    })),
    summary: {
      totalIssues: issues.length,
      uncertaintyQueueCount: widthMismatches + quoteErrors,
      formulaSensitiveCells: formulaHits,
    },
    issues,
    uncertaintySamples,
  };
}
