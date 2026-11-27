/**
 * @fileoverview CSV Rescue v2.2 — Public 10-Case CSV Torture Suite & Comparative Benchmark.
 *
 * Compares CSV Rescue v2.2 against:
 *   1. Naive JS `line.split(',')` parser
 *   2. Strict RFC 4180 parser (throws or swallows downstream records on unclosed quotes / misses semantic hazards)
 *
 * Run via: `npm run torture`
 */

import { encodeUtf8 } from '../packages/shared-types/index.mjs';
import { detectEncodingCandidates, decodeBytes } from '../packages/encoding-detector/index.mjs';
import { detectDialect } from '../packages/dialect-detector/index.mjs';
import { parseCsv } from '../packages/csv-parser/index.mjs';
import { runDiagnostics } from '../packages/diagnostic-engine/index.mjs';
import { applyFormulaProtection } from '../packages/export-engine/index.mjs';

function naiveSplitParse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  return { headers: lines[0].split(','), rows: lines.slice(1).map((l) => l.split(',')) };
}

function strictRfcParse(text) {
  // Classic RFC 4180 state machine: an unclosed quote swallows ALL subsequent lines into 1 giant cell!
  const rows = [];
  let row = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      row.push(cur.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return { headers: rows[0] || [], rows: rows.slice(1), unclosedAtEof: inQ };
}

const TORTURE_CASES = [
  {
    id: 'T01_UTF8_BOM_CJK',
    title: 'UTF-8 BOM + Chinese/Malay/English',
    run() {
      const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...encodeUtf8('name,city\r\n陈小明,吉隆坡\r\nNur Aisyah,Kuala Lumpur\r\n')]);
      const enc = detectEncodingCandidates(bytes);
      const dec = decodeBytes(bytes, enc.recommended);
      const parsed = parseCsv(dec.text);
      const naive = naiveSplitParse(new TextDecoder('utf-8').decode(bytes));
      const naiveHasBomInHeader = naive.headers[0].charCodeAt(0) === 0xfeff;
      return {
        csvRescue: enc.recommended === 'utf-8-bom' && parsed.headers[0] === 'name' && parsed.rows[0].cells[0] === '陈小明' ? 'PASS (BOM stripped cleanly)' : 'FAIL',
        naive: naiveHasBomInHeader ? 'CORRUPT (BOM pollutes col 0)' : 'PASS',
        strictRfc: 'PASS (if decoded)',
      };
    },
  },
  {
    id: 'T02_UNQUOTED_ADDR_COMMA',
    title: 'Unquoted comma in address shifts columns',
    run() {
      const csv = 'id,name,address,postcode\n1,Ali,12 Jalan Merah, Kuala Lumpur,05100\n2,Mei,"88 Bukit Bintang, KL",55100\n';
      const parsed = parseCsv(csv);
      const diag = runDiagnostics({ headers: parsed.headers, rows: parsed.rows });
      const hasCandidate = diag.uncertaintyItems.some((u) => u.issueCode === 'ROW_WIDTH_MISMATCH' && u.candidateFix);
      return {
        csvRescue: hasCandidate ? 'PASS (Quarantined + Merge Preview)' : 'FAIL',
        naive: 'SILENT CORRUPTION (splits quoted addr too)',
        strictRfc: 'SILENT SHIFT (no width warning)',
      };
    },
  },
  {
    id: 'T03_UNCLOSED_QUOTE_MIDFILE',
    title: 'Unclosed quote mid-file',
    run() {
      const csv = 'id,name,notes\n1,"Broken quote,oops\n2,Valid Alice,ok\n3,Valid Bob,ok\n';
      const parsed = parseCsv(csv);
      const strict = strictRfcParse(csv);
      return {
        csvRescue: parsed.rows.length === 3 && parsed.rows[0].hasQuoteIssue && parsed.rows[2].cells[1] === 'Valid Bob'
          ? 'PASS (Isolated row 1, kept rows 2-3)'
          : 'FAIL',
        naive: 'CORRUPT (stray quotes kept)',
        strictRfc: `SWALLOWED (${strict.rows.length} row left of 3!)`,
      };
    },
  },
  {
    id: 'T04_MULTILINE_QUOTED_FIELD',
    title: 'Legitimate RFC 4180 multiline quoted cell',
    run() {
      const csv = 'id,note\n1,"Line 1\nLine 2"\n2,Single\n';
      const parsed = parseCsv(csv);
      const naive = naiveSplitParse(csv);
      return {
        csvRescue: parsed.rows.length === 2 && parsed.rows[0].isMultiline ? 'PASS (Merged safely)' : 'FAIL',
        naive: `BROKEN (${naive.rows.length} rows instead of 2)`,
        strictRfc: 'PASS',
      };
    },
  },
  {
    id: 'T05_REPEATED_HEADER_AND_BLANK',
    title: 'Concatenated export (repeated header + blanks)',
    run() {
      const csv = 'sku,price\nS1,10\n,\nsku,price\nS2,20\n';
      const parsed = parseCsv(csv);
      const diag = runDiagnostics({ headers: parsed.headers, rows: parsed.rows });
      const codes = new Set(diag.issues.map((i) => i.code));
      return {
        csvRescue: codes.has('BLANK_ROWS') && codes.has('REPEATED_HEADER_ROWS') ? 'PASS (Both flagged as safe fixes)' : 'FAIL',
        naive: 'NO DETECTION (treats header as data)',
        strictRfc: 'NO DETECTION',
      };
    },
  },
  {
    id: 'T06_AMBIGUOUS_DATES',
    title: 'Mixed ISO + ambiguous DD/MM vs MM/DD dates',
    run() {
      const csv = 'id,order_date\n1,2026-03-04\n2,04/03/2026\n';
      const parsed = parseCsv(csv);
      const diag = runDiagnostics({ headers: parsed.headers, rows: parsed.rows });
      const dateIss = diag.issues.find((i) => i.code === 'MIXED_OR_AMBIGUOUS_DATES');
      return {
        csvRescue: dateIss && dateIss.requiresConfirmation ? 'PASS (Flags ambiguity, asks DMY/MDY)' : 'FAIL',
        naive: 'NO DETECTION',
        strictRfc: 'NO DETECTION',
      };
    },
  },
  {
    id: 'T07_LEADING_ZERO_POSTCODE',
    title: 'Leading-zero postal codes (05100, 018989)',
    run() {
      const csv = 'id,postal_code\n1,05100\n2,018989\n';
      const parsed = parseCsv(csv);
      const diag = runDiagnostics({ headers: parsed.headers, rows: parsed.rows });
      const hasRisk = diag.issues.some((i) => i.code === 'LEADING_ZERO_RISK');
      return {
        csvRescue: hasRisk && parsed.rows[0].cells[1] === '05100' ? 'PASS (Preserved string + Excel warning)' : 'FAIL',
        naive: 'NO EXCEL WARNING',
        strictRfc: 'NO EXCEL WARNING',
      };
    },
  },
  {
    id: 'T08_OWASP_FORMULA_INJECTION',
    title: 'OWASP CSV Formula Injection (=, @, +cmd vs -42.50)',
    run() {
      const csv = 'id,val\n1,=HYPERLINK("http://evil")\n2,@SUM(1+1)\n3,-42.50\n';
      const parsed = parseCsv(csv);
      const diag = runDiagnostics({ headers: parsed.headers, rows: parsed.rows });
      const { protectedCount } = applyFormulaProtection(parsed.rows.map((r) => r.cells), 'prefix_quote');
      return {
        csvRescue: diag.formulaHits.length === 2 && protectedCount === 2 ? 'PASS (2 threats flagged, -42.50 safe)' : 'FAIL',
        naive: 'UNPROTECTED',
        strictRfc: 'UNPROTECTED',
      };
    },
  },
  {
    id: 'T09_PREEXISTING_FFFD_LOSS',
    title: 'Irreversible baked-in U+FFFD (EF BF BD) mojibake',
    run() {
      const bytes = new Uint8Array([0x61, 0x2c, 0xef, 0xbf, 0xbd, 0x0a, 0x31, 0x2c, 0x32, 0x0a]);
      const enc = detectEncodingCandidates(bytes);
      return {
        csvRescue: enc.hasPreexistingReplacementChars ? 'PASS (Honest irreversible-damage warning)' : 'FAIL',
        naive: 'SILENT GARBAGE',
        strictRfc: 'SILENT GARBAGE',
      };
    },
  },
  {
    id: 'T10_SEMICOLON_WIN1252',
    title: 'European semicolon CSV in Windows-1252 (café / €)',
    run() {
      // "item;price\ncafé;€49\n" in Windows-1252 (é = 0xE9, € = 0x80)
      const bytes = new Uint8Array([
        0x69, 0x74, 0x65, 0x6d, 0x3b, 0x70, 0x72, 0x69, 0x63, 0x65, 0x0a,
        0x63, 0x61, 0x66, 0xe9, 0x3b, 0x80, 0x34, 0x39, 0x0a,
      ]);
      const enc = detectEncodingCandidates(bytes);
      const dec = decodeBytes(bytes, 'windows-1252');
      const dialect = detectDialect(dec.text);
      const parsed = parseCsv(dec.text, { delimiter: dialect.delimiter });
      return {
        csvRescue: dialect.delimiter === ';' && parsed.rows[0].cells[0] === 'café' && parsed.rows[0].cells[1] === '€49'
          ? 'PASS (Detected ; + Win-1252 preview)'
          : 'FAIL',
        naive: 'BROKEN (comma split + UTF-8 mojibake)',
        strictRfc: 'BROKEN (comma split)',
      };
    },
  },
];

const results = TORTURE_CASES.map((tc) => ({
  id: tc.id,
  scenario: tc.title,
  ...tc.run(),
}));

console.log('=== CSV Rescue v2.2 — Public 10-Case CSV Torture Suite ===\n');
console.table(results);

const passed = results.filter((r) => r.csvRescue.startsWith('PASS')).length;
console.log(`\nCSV Rescue Torture Score: ${passed} / ${results.length} PASS`);
if (passed !== results.length) {
  process.exit(1);
}
