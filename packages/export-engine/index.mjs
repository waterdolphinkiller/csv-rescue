/**
 * @fileoverview Safe Export Engine & CSV Rescue Receipt generator.
 * Supports CSV UTF-8, CSV UTF-8 BOM (Excel), TSV, JSON, Custom Delimiter,
 * Excel SpreadsheetML (.xls), OWASP Formula Injection protection,
 * separate Unresolved Queue export, and privacy-safe HTML/JSON Repair Receipts.
 */

import { CSV_RESCUE_VERSION, encodeUtf8, sha256Hex } from '../shared-types/index.mjs';
import { serializeCsv } from '../csv-parser/index.mjs';
import { isFormulaSensitive } from '../diagnostic-engine/index.mjs';

/**
 * Apply optional OWASP CSV Formula Injection protection to cell matrix.
 * Explicitly returns count of modified cells so the user knows export values changed.
 *
 * @param {string[][]} rows
 * @param {'none' | 'prefix_quote' | 'prefix_tab'} mode
 * @returns {{ rows: string[][], protectedCount: number }}
 */
export function applyFormulaProtection(rows, mode = 'none') {
  if (mode === 'none') return { rows, protectedCount: 0 };
  const prefix = mode === 'prefix_tab' ? '\t' : "'";
  let protectedCount = 0;

  const next = rows.map((r) =>
    r.map((cell) => {
      if (isFormulaSensitive(cell)) {
        protectedCount++;
        return `${prefix}${cell}`;
      }
      return cell;
    })
  );
  return { rows: next, protectedCount };
}

/**
 * Escape XML special characters for Excel SpreadsheetML export.
 * @param {string} str
 */
function escapeXml(str) {
  return String(str ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build an Excel-compatible SpreadsheetML (.xls) XML string that preserves
 * leading zeros on postal codes / phone numbers by storing cells as String type.
 * @param {string[]} headers
 * @param {string[][]} rows
 */
export function serializeSpreadsheetXml(headers, rows) {
  const rowXml = (cells) =>
    `<Row>${cells
      .map((c) => `<Cell><Data ss:Type="String">${escapeXml(c)}</Data></Cell>`)
      .join('')}</Row>`;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="CSV_Rescue_Cleaned">',
    '<Table>',
    rowXml(headers),
    ...rows.map(rowXml),
    '</Table>',
    '</Worksheet>',
    '</Workbook>',
  ].join('\n');
}

/**
 * Export table into the selected format and compute output SHA-256 hash.
 *
 * @param {{ headers: string[], rows: Array<{ cells: string[] }> }} table
 * @param {{
 *   format: 'csv' | 'csv-bom' | 'tsv' | 'json' | 'custom' | 'excel-xml',
 *   customDelimiter?: string,
 *   formulaProtection?: 'none' | 'prefix_quote' | 'prefix_tab',
 *   lineEnding?: string
 * }} options
 */
export async function buildSafeExport(table, options) {
  const format = options.format || 'csv-bom';
  const formulaMode = options.formulaProtection || 'none';
  const lineEnding = options.lineEnding || '\r\n';

  const rawMatrix = table.rows.map((r) => r.cells);
  const { rows: safeHeaderWrap, protectedCount: headerProt } = applyFormulaProtection([table.headers], formulaMode);
  const safeHeaders = safeHeaderWrap[0] || table.headers;
  const { rows: safeMatrix, protectedCount: bodyProt } = applyFormulaProtection(rawMatrix, formulaMode);
  const protectedCount = headerProt + bodyProt;

  let content = '';
  let mimeType = 'text/csv;charset=utf-8';
  let extension = 'csv';
  let prependBom = false;

  if (format === 'csv-bom') {
    content = serializeCsv(safeHeaders, safeMatrix, { delimiter: ',', lineEnding });
    prependBom = true;
    extension = 'csv';
  } else if (format === 'csv') {
    content = serializeCsv(safeHeaders, safeMatrix, { delimiter: ',', lineEnding });
    extension = 'csv';
  } else if (format === 'tsv') {
    content = serializeCsv(safeHeaders, safeMatrix, { delimiter: '\t', lineEnding });
    mimeType = 'text/tab-separated-values;charset=utf-8';
    extension = 'tsv';
  } else if (format === 'custom') {
    const delim = options.customDelimiter || ';';
    content = serializeCsv(safeHeaders, safeMatrix, { delimiter: delim, lineEnding });
    extension = 'csv';
  } else if (format === 'json') {
    const records = safeMatrix.map((cells) => {
      const obj = {};
      table.headers.forEach((h, idx) => {
        obj[h] = cells[idx] ?? '';
      });
      return obj;
    });
    content = JSON.stringify(records, null, 2);
    mimeType = 'application/json;charset=utf-8';
    extension = 'json';
  } else if (format === 'excel-xml') {
    content = serializeSpreadsheetXml(safeHeaders, safeMatrix);
    mimeType = 'application/vnd.ms-excel;charset=utf-8';
    extension = 'xls';
  }

  const textBytes = encodeUtf8(content);
  let finalBytes = textBytes;
  if (prependBom) {
    finalBytes = new Uint8Array(3 + textBytes.length);
    finalBytes[0] = 0xef;
    finalBytes[1] = 0xbb;
    finalBytes[2] = 0xbf;
    finalBytes.set(textBytes, 3);
  }

  const outputHash = await sha256Hex(finalBytes);

  return {
    bytes: finalBytes,
    text: content,
    mimeType,
    extension,
    byteLength: finalBytes.length,
    outputHash,
    formulaProtectedCount: protectedCount,
    formulaProtectionMode: formulaMode,
  };
}

/**
 * Generate a privacy-safe CSV Rescue Receipt (JSON object + standalone HTML report).
 * By default, NEVER embeds raw cell values so the receipt can be shared safely.
 *
 * @param {{
 *   fileName: string,
 *   inputHash: string,
 *   outputHash: string,
 *   encoding: string,
 *   delimiter: string,
 *   exportFormat: string,
 *   formulaProtectionMode: string,
 *   formulaProtectedCount: number,
 *   ledger: any,
 *   appliedRules: Array<any>,
 *   unresolvedItems: Array<any>
 * }} data
 */
export function generateRepairReceipt(data) {
  const timestamp = new Date().toISOString();
  const receiptJson = {
    schema: 'csv-rescue-receipt/v1',
    toolVersion: CSV_RESCUE_VERSION,
    generatedAt: timestamp,
    privacyNotice:
      'Raw cell values are omitted by default to prevent accidental disclosure of sensitive data. SHA-256 hashes verify file integrity only.',
    sourceFile: {
      name: data.fileName,
      sha256: data.inputHash,
      bytes: data.ledger?.originalBytesLength ?? 0,
      rows: data.ledger?.originalRowCount ?? 0,
      columns: data.ledger?.originalColCount ?? 0,
    },
    outputFile: {
      format: data.exportFormat,
      encoding: data.encoding,
      delimiter: data.delimiter,
      sha256: data.outputHash,
      bytes: data.ledger?.outputBytesLength ?? 0,
      rows: data.ledger?.outputRowCount ?? 0,
      columns: data.ledger?.outputColCount ?? 0,
    },
    safety: {
      formulaProtectionMode: data.formulaProtectionMode,
      formulaProtectedCells: data.formulaProtectedCount,
      owaspNote:
        'Spreadsheet formula behavior varies by application and save/re-open cycle; verify high-risk files before distribution.',
    },
    summary: {
      rowsRemoved: data.ledger?.rowsRemovedTotal ?? 0,
      cellsModified: data.ledger?.cellsModifiedTotal ?? 0,
      autoFixedCount: data.ledger?.autoFixedCount ?? 0,
      userConfirmedCount: data.ledger?.userConfirmedCount ?? 0,
      keptOriginalCount: data.ledger?.keptOriginalCount ?? 0,
      unresolvedRemaining: data.unresolvedItems?.length ?? 0,
    },
    appliedRules: (data.appliedRules || []).map((r, i) => ({
      step: i + 1,
      ruleId: r.ruleId,
      description: r.description,
      affectedRows: r.affectedRows,
      affectedCells: r.affectedCells,
      removedRows: r.removedRows,
    })),
    unresolvedSummary: (data.unresolvedItems || []).map((u) => ({
      rowNumber: u.rowNumber,
      sourceLine: u.sourceLine,
      issueCode: u.issueCode,
      status: u.status,
    })),
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CSV Rescue Receipt — ${escapeXml(data.fileName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; line-height: 1.5; }
  .card { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(15,23,42,.06); }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 16px 0 24px; }
  .stat { background: #f1f5f9; border-radius: 8px; padding: 12px; }
  .stat .k { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: .04em; }
  .stat .v { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; color: #475569; font-weight: 600; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; word-break: break-all; }
  .note { background: #eff6ff; border-left: 3px solid #2563eb; padding: 10px 14px; font-size: 12px; color: #1e3a8a; border-radius: 4px; }
</style>
</head>
<body>
<div class="card">
  <h1>CSV Rescue — Repair Receipt</h1>
  <div class="sub">Generated ${escapeXml(timestamp)} · CSV Rescue v${CSV_RESCUE_VERSION} · Local-first audit record</div>
  <div class="grid">
    <div class="stat"><div class="k">Original Rows</div><div class="v">${receiptJson.sourceFile.rows}</div></div>
    <div class="stat"><div class="k">Output Rows</div><div class="v">${receiptJson.outputFile.rows}</div></div>
    <div class="stat"><div class="k">Cells Modified</div><div class="v">${receiptJson.summary.cellsModified}</div></div>
    <div class="stat"><div class="k">Unresolved Queue</div><div class="v">${receiptJson.summary.unresolvedRemaining}</div></div>
  </div>
  <h3>File Integrity</h3>
  <table>
    <tr><th>Source File</th><td>${escapeXml(receiptJson.sourceFile.name)}</td></tr>
    <tr><th>Input SHA-256</th><td><code>${escapeXml(receiptJson.sourceFile.sha256 || 'N/A')}</code></td></tr>
    <tr><th>Output Format & Encoding</th><td>${escapeXml(receiptJson.outputFile.format)} (${escapeXml(receiptJson.outputFile.encoding)})</td></tr>
    <tr><th>Output SHA-256</th><td><code>${escapeXml(receiptJson.outputFile.sha256 || 'N/A')}</code></td></tr>
    <tr><th>Formula Protection</th><td>${escapeXml(receiptJson.safety.formulaProtectionMode)} (${receiptJson.safety.formulaProtectedCells} cells)</td></tr>
  </table>
  <h3>Applied Rules (${receiptJson.appliedRules.length})</h3>
  <table>
    <thead><tr><th>#</th><th>Rule</th><th>Affected Rows</th><th>Cells Modified</th><th>Rows Removed</th></tr></thead>
    <tbody>
      ${
        receiptJson.appliedRules.length > 0
          ? receiptJson.appliedRules
              .map(
                (r) =>
                  `<tr><td>${r.step}</td><td>${escapeXml(r.description)}</td><td>${r.affectedRows}</td><td>${r.affectedCells}</td><td>${r.removedRows}</td></tr>`
              )
              .join('')
          : '<tr><td colspan="5">No transformation rules applied (inspection/export only).</td></tr>'
      }
    </tbody>
  </table>
  <div class="note">${escapeXml(receiptJson.privacyNotice)}</div>
</div>
</body>
</html>`;

  return { json: receiptJson, html };
}

/**
 * Generate a self-contained, offline interactive HTML Human-in-the-Loop Review Page (v2.2).
 * Produced by MCP `csv_execute_pipeline` when AI finishes 95% deterministic cleaning
 * and hands off the remaining uncertain/broken rows to a human reviewer.
 *
 * @param {{
 *   fileName: string,
 *   headers: string[],
 *   appliedRules: Array<{ ruleId: string, description: string, affectedRows: number }>,
 *   uncertaintyItems: Array<{
 *     id: string,
 *     rowNumber: number,
 *     sourceLine: number,
 *     issueCode: string,
 *     title: string,
 *     reason: string,
 *     raw: string,
 *     originalCells: string[],
 *     candidateFix?: { description: string, proposedCells: string[] } | null
 *   }>,
 *   rowsBefore: number,
 *   rowsAfter: number,
 *   outputPath?: string | null
 * }} data
 * @returns {string}
 */
export function generateHumanReviewHtml(data) {
  const payload = {
    fileName: data.fileName || 'dataset.csv',
    headers: data.headers || [],
    appliedRules: data.appliedRules || [],
    uncertaintyItems: data.uncertaintyItems || [],
    rowsBefore: data.rowsBefore ?? 0,
    rowsAfter: data.rowsAfter ?? 0,
    outputPath: data.outputPath || null,
    generatedAt: new Date().toISOString(),
  };
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CSV Rescue — Human-in-the-Loop Review (${escapeXml(payload.fileName)})</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; background: #f4f7fb; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; }
  .wrap { max-width: 960px; margin: 0 auto; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .sub { color: #64748b; font-size: 13px; }
  .pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .pill.warn { background: #fffbeb; color: #b45309; border-color: #fde68a; }
  .pill.safe { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .item { border-left: 4px solid #d97706; }
  .item.resolved { border-left-color: #059669; opacity: 0.85; }
  .raw { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 6px; word-break: break-all; margin: 8px 0; }
  .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin: 10px 0; }
  .fields label { display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 2px; }
  .fields input { width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; }
  .btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; padding: 6px 12px; border-radius: 7px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .btn-primary { background: #2563eb; border-color: #2563eb; color: #fff; }
  .btn-safe { background: #059669; border-color: #059669; color: #fff; }
  .btn-danger { color: #dc2626; border-color: #fecaca; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
</style>
</head>
<body>
<div class="wrap" id="root"></div>
<script>
const DATA = ${safeJson};
const decisions = {};
DATA.uncertaintyItems.forEach((u) => {
  decisions[u.id] = {
    action: 'pending',
    cells: (u.candidateFix && u.candidateFix.proposedCells ? u.candidateFix.proposedCells : u.originalCells).slice(0, DATA.headers.length),
  };
});

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function download(text, mime, name) {
  const b = new Blob([text], { type: mime });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

function render() {
  const resolvedCount = Object.values(decisions).filter((d) => d.action !== 'pending').length;
  const total = DATA.uncertaintyItems.length;
  document.getElementById('root').innerHTML = \`
    <div class="card">
      <div class="bar">
        <div>
          <h1>CSV Rescue — Human-in-the-Loop Review</h1>
          <div class="sub">File: <strong>\${esc(DATA.fileName)}</strong> · AI applied \${DATA.appliedRules.length} deterministic rule(s) (\${DATA.rowsBefore} → \${DATA.rowsAfter} rows) · 100% Local Offline Review</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="pill \${resolvedCount === total ? 'safe' : 'warn'}">\${resolvedCount} / \${total} Reviewed</span>
          <button class="btn btn-primary" id="btn-export-decisions">Export Decisions JSON</button>
          <button class="btn btn-safe" id="btn-export-csv">Export Resolved Rows CSV</button>
        </div>
      </div>
    </div>
    \${DATA.uncertaintyItems.length === 0 ? '<div class="card">No uncertain rows remaining!</div>' : DATA.uncertaintyItems.map((u) => {
      const dec = decisions[u.id];
      return \`
      <div class="card item \${dec.action !== 'pending' ? 'resolved' : ''}">
        <div class="bar" style="margin-bottom:6px;">
          <div><span class="pill warn">\${esc(u.issueCode)}</span> <strong>\${esc(u.title)}</strong> <span class="sub">(Line \${u.sourceLine})</span></div>
          <span class="pill \${dec.action === 'pending' ? 'warn' : 'safe'}">\${esc(dec.action)}</span>
        </div>
        <div class="sub">\${esc(u.reason)}</div>
        <div class="raw"><strong>Raw:</strong> \${esc(u.raw)}</div>
        <div class="fields">
          \${DATA.headers.map((h, i) => \`
            <div>
              <label>\${esc(h)}</label>
              <input data-uq="\${esc(u.id)}" data-col="\${i}" value="\${esc(dec.cells[i] ?? '')}" />
            </div>
          \`).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          \${u.candidateFix ? \`<button class="btn btn-safe" data-act="accept" data-uq="\${esc(u.id)}">✓ Accept Candidate</button>\` : ''}
          <button class="btn btn-primary" data-act="save" data-uq="\${esc(u.id)}">Save Edited Row</button>
          <button class="btn" data-act="keep" data-uq="\${esc(u.id)}">Keep Original</button>
          <button class="btn btn-danger" data-act="exclude" data-uq="\${esc(u.id)}">Exclude Row</button>
        </div>
      </div>\`;
    }).join('')}
  \`;

  document.querySelectorAll('input[data-uq]').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      decisions[e.target.dataset.uq].cells[Number(e.target.dataset.col)] = e.target.value;
    });
  });
  document.querySelectorAll('button[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.uq;
      const act = btn.dataset.act;
      const item = DATA.uncertaintyItems.find((x) => x.id === id);
      if (act === 'accept' && item?.candidateFix) {
        decisions[id].cells = item.candidateFix.proposedCells.slice(0, DATA.headers.length);
        decisions[id].action = 'accepted';
      } else if (act === 'save') {
        decisions[id].action = 'edited';
      } else if (act === 'keep') {
        decisions[id].cells = item.originalCells.slice(0, DATA.headers.length);
        decisions[id].action = 'kept_original';
      } else if (act === 'exclude') {
        decisions[id].action = 'excluded';
      }
      render();
    });
  });
  document.getElementById('btn-export-decisions')?.addEventListener('click', () => {
    download(JSON.stringify({ fileName: DATA.fileName, reviewedAt: new Date().toISOString(), decisions }, null, 2), 'application/json', 'human_review_decisions.json');
  });
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const escCsv = (v) => /[",\\n\\r]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? '');
    const rows = DATA.uncertaintyItems
      .filter((u) => decisions[u.id].action !== 'excluded')
      .map((u) => decisions[u.id].cells.map(escCsv).join(','));
    const csv = [DATA.headers.map(escCsv).join(','), ...rows].join('\\r\\n');
    download('\\uFEFF' + csv, 'text/csv;charset=utf-8', 'human_resolved_rows.csv');
  });
}
render();
</script>
</body>
</html>`;
}
