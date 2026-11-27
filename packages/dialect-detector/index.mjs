/**
 * @fileoverview Dialect Detector — detects delimiter, quote char, line ending,
 * column width stability, and whether row 1 is a header.
 */

import { DELIMITER_OPTIONS } from '../shared-types/index.mjs';

/**
 * Count occurrences of delimiter outside quotes on a single line.
 * @param {string} line
 * @param {string} delimiter
 * @param {string} quoteChar
 * @returns {number}
 */
function countFieldsOnLine(line, delimiter, quoteChar = '"') {
  let inQuotes = false;
  let count = 1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === quoteChar) {
      if (inQuotes && line[i + 1] === quoteChar) {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      count++;
    }
  }
  return count;
}

/**
 * Detect line ending style in text sample.
 * @param {string} text
 * @returns {{ lineEnding: '\r\n' | '\n' | '\r', label: string, mixed: boolean }}
 */
export function detectLineEnding(text) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const withoutCrlf = text.replace(/\r\n/g, '');
  const lf = (withoutCrlf.match(/\n/g) || []).length;
  const cr = (withoutCrlf.match(/\r/g) || []).length;

  const nonZero = [crlf > 0, lf > 0, cr > 0].filter(Boolean).length;
  const mixed = nonZero > 1;

  if (crlf >= lf && crlf >= cr && crlf > 0) {
    return { lineEnding: '\r\n', label: 'CRLF (Windows)', mixed };
  }
  if (cr > lf && cr > crlf) {
    return { lineEnding: '\r', label: 'CR (Legacy Mac)', mixed };
  }
  return { lineEnding: '\n', label: 'LF (Unix / macOS)', mixed };
}

/**
 * Heuristic check whether the first row looks like a header row.
 * @param {string[]} firstRow
 * @param {string[][]} dataRows
 * @returns {{ hasHeader: boolean, confidence: 'high' | 'medium' | 'low', reason: string }}
 */
export function detectHeaderRow(firstRow, dataRows) {
  if (!firstRow || firstRow.length === 0) {
    return { hasHeader: false, confidence: 'low', reason: 'Empty first row' };
  }
  const numPattern = /^[-+$£€¥RM\s]*\d[\d,.\s]*%?$/i;
  const datePattern = /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let firstRowNumericOrData = 0;
  for (const cell of firstRow) {
    const v = (cell || '').trim();
    if (!v) continue;
    if (numPattern.test(v) || datePattern.test(v) || emailPattern.test(v)) {
      firstRowNumericOrData++;
    }
  }

  let dataRowsNumericOrData = 0;
  let dataCellsChecked = 0;
  for (const r of dataRows.slice(0, 10)) {
    for (const cell of r) {
      const v = (cell || '').trim();
      if (!v) continue;
      dataCellsChecked++;
      if (numPattern.test(v) || datePattern.test(v) || emailPattern.test(v)) {
        dataRowsNumericOrData++;
      }
    }
  }

  const firstRatio = firstRowNumericOrData / Math.max(1, firstRow.length);
  const dataRatio = dataCellsChecked > 0 ? dataRowsNumericOrData / dataCellsChecked : 0;
  const uniqueFirst = new Set(firstRow.map((c) => (c || '').trim().toLowerCase())).size;

  if (firstRatio === 0 && uniqueFirst === firstRow.length) {
    return {
      hasHeader: true,
      confidence: dataRatio > 0.15 ? 'high' : 'medium',
      reason: 'Row 1 contains unique text labels while subsequent rows contain data values',
    };
  }
  if (firstRatio > 0.4) {
    return {
      hasHeader: false,
      confidence: 'medium',
      reason: 'Row 1 contains numeric, date, or email values typical of data records',
    };
  }
  return {
    hasHeader: true,
    confidence: 'medium',
    reason: 'Row 1 is mostly text and likely serves as column headers',
  };
}

/**
 * Detect CSV dialect (delimiter, quote char, line ending, expected column count).
 * @param {string} text
 * @returns {{
 *   delimiter: string,
 *   delimiterLabel: string,
 *   quoteChar: string,
 *   lineEnding: string,
 *   lineEndingLabel: string,
 *   mixedLineEndings: boolean,
 *   expectedColumns: number,
 *   stability: number,
 *   candidates: Array<{ delimiter: string, label: string, modeColumns: number, stability: number, score: number }>
 * }}
 */
export function detectDialect(text) {
  const le = detectLineEnding(text);
  const rawLines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(0, 80);

  const quoteChar = '"';
  const candidates = [];

  for (const opt of DELIMITER_OPTIONS) {
    if (rawLines.length === 0) {
      candidates.push({
        delimiter: opt.char,
        label: opt.label,
        modeColumns: 1,
        stability: 0,
        score: opt.char === ',' ? 10 : 0,
      });
      continue;
    }

    const counts = rawLines.map((line) => countFieldsOnLine(line, opt.char, quoteChar));
    const freq = new Map();
    for (const c of counts) {
      freq.set(c, (freq.get(c) || 0) + 1);
    }

    let modeColumns = 1;
    let modeCount = 0;
    for (const [colCount, f] of freq.entries()) {
      if (f > modeCount || (f === modeCount && colCount > modeColumns)) {
        modeColumns = colCount;
        modeCount = f;
      }
    }

    const stability = rawLines.length > 0 ? modeCount / rawLines.length : 0;
    const score =
      modeColumns <= 1
        ? 0
        : stability * 75 + Math.min(25, Math.log2(modeColumns + 1) * 8);

    candidates.push({
      delimiter: opt.char,
      label: opt.label,
      modeColumns,
      stability: Number(stability.toFixed(3)),
      score: Number(score.toFixed(2)),
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] || {
    delimiter: ',',
    label: 'Comma (,)',
    modeColumns: 1,
    stability: 1,
  };

  return {
    delimiter: best.delimiter,
    delimiterLabel: best.label,
    quoteChar,
    lineEnding: le.lineEnding,
    lineEndingLabel: le.label,
    mixedLineEndings: le.mixed,
    expectedColumns: best.modeColumns,
    stability: best.stability,
    candidates,
  };
}
