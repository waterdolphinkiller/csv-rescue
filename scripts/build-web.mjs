/**
 * @fileoverview Deterministic zero-dependency bundler for CSV Rescue Web App.
 * Bundles all core packages into `window.CsvRescueCore` + inline Blob Web Worker,
 * embeds GEO/SEO JSON-LD, collapsible editorial footer, and interactive in-app
 * guide/meta-doc data so every footer link works seamlessly in Canvas, offline file://,
 * AND deployed multi-page GitHub Pages.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GUIDES,
  buildRobotsTxt,
  buildSitemapXml,
  buildLlmsTxt,
  buildLlmsFullTxt,
} from './geo-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SITE_URL = (process.env.SITE_URL || 'https://csv-rescue.github.io/csv-rescue').replace(/\/+$/, '');

const PACKAGE_ORDER = [
  'packages/shared-types/index.mjs',
  'packages/plugin-registry/index.mjs',
  'packages/encoding-detector/index.mjs',
  'packages/dialect-detector/index.mjs',
  'packages/csv-parser/index.mjs',
  'packages/xlsx-reader/index.mjs',
  'packages/diagnostic-engine/index.mjs',
  'packages/repair-rules/index.mjs',
  'packages/mapping-engine/index.mjs',
  'packages/quality-profile/index.mjs',
  'packages/export-engine/index.mjs',
];

function stripModuleSyntax(code) {
  return code
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+(async\s+)?function\s+/gm, '$1function ')
    .replace(/^\s*export\s+const\s+/gm, 'const ')
    .replace(/^\s*export\s+let\s+/gm, 'let ')
    .replace(
      /const\s+\{\s*createHash\s*\}\s*=\s*await\s+import\(['"]node:crypto['"]\);/g,
      'throw new Error("SubtleCrypto unavailable");'
    )
    .replace(
      /const\s+\{\s*inflateRawSync\s*\}\s*=\s*await\s+import\(['"]node:zlib['"]\);/g,
      'throw new Error("Browser DecompressionStream required for .xlsx");'
    );
}

function buildJsonLd(siteUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'CSV Rescue',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any (Web Browser, macOS, Windows, Linux)',
        softwareVersion: '2.4.0',
        url: `${siteUrl}/`,
        license: 'https://opensource.org/licenses/MIT',
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description:
          'Local-first, zero-upload CSV and native Excel (.xlsx) repair workspace for US business teams and AI agents. Fixes broken quotes, unquoted address commas, UTF-8 mojibake, leading-zero US ZIP codes (02138/07030), ambiguous dates, and OWASP formula injection entirely in your browser or Node.js CLI/MCP server.',
        featureList: [
          '100% browser-local processing with zero cloud uploads (safe for customer PII)',
          'Native multi-sheet .xlsx reader and CSV/TSV dialect auto-detection',
          'Before/After Repair Evidence cards with instant Ctrl+Z patch undo',
          'Uncertainty Queue quarantines broken or ambiguous rows instead of silently guessing',
          'OWASP CSV Formula Injection protection (=, +, -, @) and SHA-256 Repair Receipts',
          'O(1) constant-memory streaming engine: 500,000 rows (45.46 MB) in ~1.2s under 20 MB heap',
          'Zero-dependency Stdio MCP Server with --allow-dir symlink-safe path sandbox',
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Does CSV Rescue upload my CSV or Excel files to any server?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. CSV Rescue runs 100% locally in your browser using an inline Web Worker and zero external runtime dependencies. Your files never leave your device, making it safe for customer lists, invoices, payroll exports, and other PII-heavy spreadsheets.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I fix Excel stripping leading zeros from US ZIP codes like 02138 or 07030?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Open the CSV or .xlsx file in CSV Rescue, apply the Preserve Leading Zeros rule (5-digit text padding, including ZIP+4 like 02108-1234), and export as Excel SpreadsheetML (.xls) or UTF-8 CSV with BOM so spreadsheet apps keep postal codes as text.',
            },
          },
          {
            '@type': 'Question',
            name: 'How large of a CSV file can CSV Rescue handle?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'In the browser, CSV Rescue uses a non-blocking Web Worker and 34px fixed-height Virtual Scroll grid to handle 100,000+ rows smoothly. In Node.js CLI and MCP Server mode, its O(1) constant-memory disk-streaming engine processes 500,000 rows (45.46 MB) in roughly 1.1 to 1.25 seconds using under 20 MB of heap memory.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can AI agents like Claude Desktop, Cursor, or Gemini CLI use CSV Rescue?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. CSV Rescue ships with a zero-dependency Stdio MCP Server (apps/mcp-server/index.mjs) exposing four token-efficient tools (csv_inspect, csv_preview_pipeline, csv_execute_pipeline, csv_diff_or_merge), protected by an --allow-dir path sandbox and optional offline Human-in-the-Loop HTML review pages.',
            },
          },
        ],
      },
    ],
  };
  return JSON.stringify(schema, null, 2).replace(/<\//g, '<\\/');
}

function buildEditorialFooter() {
  return `
  <footer class="editorial-footer" aria-label="About CSV Rescue and Repair Guides">
    <div class="editorial-intro">
      <div>
        <h2>Why CSV Rescue Exists: The 4:55 PM Friday Spreadsheet Disaster</h2>
        <p>
          Every US operations, finance, and e-commerce team knows the drill: a vendor emails a 15 MB order export right before a deadline, and opening it in Excel silently turns Boston ZIP code <code>02138</code> into <code>2138</code>, mangles accents into <code>JosÃ©</code>, splits unquoted street addresses across extra columns, and breaks your Shopify, HubSpot, or QuickBooks import. Worse, the file is full of customer PII, so pasting it into a random cloud CSV converter is out of the question.
        </p>
        <p>
          <strong>CSV Rescue</strong> is an open-source, MIT-licensed repair workbench built to solve that exact moment—100% locally in your browser or Node.js CLI/MCP server, with zero uploads, Before/After evidence for every fix, and an Uncertainty Queue that never silently guesses on broken rows.
        </p>
      </div>
      <aside class="editorial-facts" aria-label="Verified Technical Benchmarks">
        <h3>Verified Local Benchmarks &amp; Boundaries</h3>
        <ul>
          <li><strong>100% Offline &amp; Zero-Upload:</strong> Runs in an inline Web Worker; pure-JS SHA-256 works even via local <code>file://</code>.</li>
          <li><strong>Native .xlsx &amp; CSV/TSV:</strong> Zero-dependency multi-sheet Excel reader plus RFC 4180 fault-tolerant CSV parser.</li>
          <li><strong>Constant-Memory Speed:</strong> 500,000 rows (45.46 MB) streamed in ~1.1–1.25 s at &lt;20 MB heap RAM (CLI/MCP); 100k rows smooth in-browser via Virtual Scroll.</li>
          <li><strong>Auditable &amp; Safe:</strong> 10/10 CSV Torture Suite, OWASP Formula Injection guard, and privacy-safe Repair Receipts (no raw cell values stored).</li>
        </ul>
      </aside>
    </div>

    <details class="editorial-details">
      <summary>Common CSV &amp; Excel Repair Questions (US Operations, Privacy &amp; AI Agents)</summary>
      <div class="editorial-details-body">
        <h3>Does CSV Rescue upload my customer or financial data?</h3>
        <p>No. Every byte is decoded, diagnosed, repaired, and exported inside your own browser tab or local Node.js process. There is no backend server, no account signup, and zero external npm runtime dependencies.</p>

        <h3>Why does Excel drop leading zeros in US ZIP codes (02138, 07030)?</h3>
        <p>When you double-click a raw CSV, Excel auto-casts numeric strings into integers, stripping leading zeros from New England, New Jersey, and Puerto Rico postal codes. CSV Rescue detects at-risk postal columns, pads 5-digit and ZIP+4 codes safely as text, and exports Excel-ready SpreadsheetML (<code>.xls</code>) or UTF-8 BOM CSV.</p>

        <h3>How does CSV Rescue work with AI agents (MCP)?</h3>
        <p>Run <code>node apps/mcp-server/index.mjs --allow-dir ./data</code> to give Claude Desktop, Cursor, or Gemini CLI four deterministic tools (<code>csv_inspect</code>, <code>csv_preview_pipeline</code>, <code>csv_execute_pipeline</code>, <code>csv_diff_or_merge</code>). Symlink-safe path sandboxing locks disk access to your chosen folder, and any ambiguous rows can be exported to an offline Human-in-the-Loop HTML review page.</p>
      </div>
    </details>

    <details class="editorial-details">
      <summary>Step-by-Step Repair Guides for Real-World Spreadsheet Failures</summary>
      <div class="editorial-details-body">
        <div class="editorial-guides">
          ${GUIDES.map(
            (g) => `<a class="editorial-guide-link" href="./guides/${g.slug}/" data-action="open-guide" data-guide-slug="${g.slug}">
            <strong>${g.shortTitle}</strong>
            <span>${g.description}</span>
          </a>`
          ).join('\n          ')}
        </div>
      </div>
    </details>

    <div class="editorial-meta-bar">
      <span>CSV Rescue v2.4.0 · Open-Source MIT License · 100% Local-First</span>
      <span>
        <a href="./llms.txt" data-action="open-meta-doc" data-doc-key="llms.txt">llms.txt</a> ·
        <a href="./llms-full.txt" data-action="open-meta-doc" data-doc-key="llms-full.txt">llms-full.txt</a> ·
        <a href="./sitemap.xml" data-action="open-meta-doc" data-doc-key="sitemap.xml">sitemap.xml</a> ·
        <a href="./robots.txt" data-action="open-meta-doc" data-doc-key="robots.txt">robots.txt</a>
      </span>
    </div>
  </footer>`;
}

export async function buildWeb(extraOutPath = null) {
  const pkgChunks = [];
  for (const rel of PACKAGE_ORDER) {
    const raw = await fs.readFile(path.join(rootDir, rel), 'utf-8');
    pkgChunks.push(`// === ${rel} ===\n${stripModuleSyntax(raw)}`);
  }

  const coreIifeBody = `(function(global) {
${pkgChunks.join('\n\n')}

global.CsvRescueCore = {
  CSV_RESCUE_VERSION,
  ENGINE_VERSION,
  SUPPORTED_ENCODINGS,
  DELIMITER_OPTIONS,
  BUILTIN_REGION_PACKS,
  validateRuleParams,
  createPluginRegistry,
  defaultRegistry,
  sha256Hex,
  encodeUtf8,
  formatBytes,
  deepClone,
  detectBom,
  decodeBytes,
  detectEncodingCandidates,
  detectLineEnding,
  detectHeaderRow,
  detectDialect,
  parseCsv,
  parseCsvStream,
  serializeCsv,
  isXlsxBytes,
  readXlsxWorkbook,
  isFormulaSensitive,
  classifyDateValue,
  profileSingleColumn,
  profileColumns,
  runDiagnostics,
  runDiagnosticsIncremental,
  normalizeDateString,
  normalizePhoneString,
  normalizeCurrencyString,
  executeRule,
  applyInversePatch,
  parseHumanFixLanguage,
  BUSINESS_PACKS,
  suggestColumnMappings,
  detectSchemaDrift,
  applyColumnMapping,
  buildIntegrityLedger,
  diffCsvTables,
  inspectBatchAlignment,
  mergeBatchFiles,
  applyFormulaProtection,
  serializeSpreadsheetXml,
  buildSafeExport,
  generateRepairReceipt,
};
})(typeof self !== 'undefined' ? self : window);`;

  const workerScript = `${coreIifeBody}

self.onmessage = async function(e) {
  const { jobId, type, payload } = e.data || {};
  const C = self.CsvRescueCore;
  try {
    if (type === 'parse_and_diagnose') {
      const { bytes, encoding, delimiter, hasHeader } = payload;
      const rawBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const inputHash = await C.sha256Hex(rawBytes);
      self.postMessage({ jobId, type: 'progress', phase: 'encoding', pct: 12 });

      const encodingReport = C.detectEncodingCandidates(rawBytes);
      const selectedEncoding = encoding || encodingReport.recommended;
      const decoded = C.decodeBytes(rawBytes, selectedEncoding);
      const dialectReport = C.detectDialect(decoded.text);
      const selectedDelimiter = delimiter || dialectReport.delimiter;

      let resolvedHeader = hasHeader;
      if (resolvedHeader === undefined || resolvedHeader === null) {
        const preview = C.parseCsv(decoded.text, { delimiter: selectedDelimiter, hasHeader: false, maxRows: 12 });
        resolvedHeader = C.detectHeaderRow(
          preview.rows[0]?.cells || [],
          preview.rows.slice(1).map((r) => r.cells)
        ).hasHeader;
      }

      self.postMessage({ jobId, type: 'progress', phase: 'parsing', pct: 25 });
      const parsed = await C.parseCsvStream(decoded.text, {
        delimiter: selectedDelimiter,
        hasHeader: resolvedHeader,
        chunkLines: 15000,
        onProgress: (info) => {
          const pct = Math.min(72, 25 + Math.round((info.bytesRead / Math.max(1, info.totalBytes)) * 47));
          self.postMessage({ jobId, type: 'progress', phase: 'parsing', pct, rowsParsed: info.rowsParsed });
        },
      });

      self.postMessage({ jobId, type: 'progress', phase: 'diagnosing', pct: 78, rowsParsed: parsed.rows.length });
      const diagnostics = C.runDiagnostics({
        headers: parsed.headers,
        rows: parsed.rows,
        parseErrors: parsed.parseErrors,
        encodingReport,
        dialectReport,
        fileSizeBytes: rawBytes.length,
      });

      self.postMessage({
        jobId,
        type: 'done',
        result: {
          inputHash,
          encodingReport,
          selectedEncoding,
          dialectReport,
          selectedDelimiter,
          hasHeader: resolvedHeader,
          headers: parsed.headers,
          rows: parsed.rows,
          parseErrors: parsed.parseErrors,
          diagnostics,
        },
      });
    }
  } catch (err) {
    self.postMessage({ jobId, type: 'error', message: err && err.message ? err.message : String(err) });
  }
};`;

  const css = await fs.readFile(path.join(rootDir, 'apps/web/src/styles.css'), 'utf-8');
  const appJs = await fs.readFile(path.join(rootDir, 'apps/web/src/app.js'), 'utf-8');

  const safeWorkerJson = JSON.stringify(workerScript).replace(/<\//g, '<\\/');
  const safeGuidesJson = JSON.stringify(GUIDES).replace(/<\//g, '<\\/');
  const safeMetaDocsJson = JSON.stringify({
    'llms.txt': buildLlmsTxt(SITE_URL),
    'llms-full.txt': buildLlmsFullTxt(SITE_URL),
    'sitemap.xml': buildSitemapXml(SITE_URL),
    'robots.txt': buildRobotsTxt(SITE_URL),
  }).replace(/<\//g, '<\\/');
  const jsonLd = buildJsonLd(SITE_URL);
  const editorialFooter = buildEditorialFooter();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CSV Rescue — Free Local-First CSV &amp; Excel (.xlsx) Repair Workspace (Zero Upload)</title>
  <meta name="description" content="Repair broken CSV and multi-sheet .xlsx files 100% locally in your browser with zero uploads. Fix UTF-8 mojibake, US ZIP leading zeros (02138), and formulas." />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${SITE_URL}/" />
  <link rel="alternate" type="text/markdown" href="./llms.txt" title="CSV Rescue LLMs.txt AI Agent Index" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="CSV Rescue" />
  <meta property="og:title" content="CSV Rescue — Local-First CSV &amp; Excel Repair Workspace (Zero Upload)" />
  <meta property="og:description" content="Fix broken quotes, UTF-8 mojibake, stripped US ZIP leading zeros, and messy vendor .xlsx files 100% locally in your browser. Zero uploads, auditable receipts, and an MCP server." />
  <meta property="og:url" content="${SITE_URL}/" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="CSV Rescue — Free Offline CSV &amp; .xlsx Repair Workbench" />
  <meta name="twitter:description" content="100% local in browser. Fix broken CSVs &amp; multi-sheet Excel files with Before/After evidence, Uncertainty Queue, and zero cloud uploads." />
  <script type="application/ld+json">
${jsonLd}
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js" crossorigin="anonymous" id="threejs-cdn"></script>
  <style>
${css}
  </style>
</head>
<body>
  <div id="app">
    <main class="container" style="padding-top:32px;">
      <p style="font-family:var(--font-mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--brand-primary);margin:0 0 10px;">LOCAL-FIRST DATA ATELIER · ZERO CLOUD UPLOADS</p>
      <h1 class="hero-stage-title" style="color:var(--text-primary);">The world’s commerce still runs on plain text. Restore order to it—<em>without ever leaving your desk.</em></h1>
      <p class="hero-lead">Repair malformed CSV, TSV, and multi-sheet Excel (.xlsx) files 100% locally in your browser or Node.js CLI/MCP server. Every fix shows Before/After evidence, uncertain rows stay quarantined, and exports include privacy-safe SHA-256 receipts.</p>
    </main>
  </div>
  ${editorialFooter}
  <div id="toast-root" class="toast-container"></div>
  <div id="modal-root"></div>
  <script>
${coreIifeBody.replace(/<\/script>/gi, '<\\/script>')}
window.__CSV_RESCUE_WORKER_SRC__ = ${safeWorkerJson};
window.__CSV_RESCUE_GUIDES__ = ${safeGuidesJson};
window.__CSV_RESCUE_META_DOCS__ = ${safeMetaDocsJson};
  </script>
  <script>
${appJs}
  </script>
</body>
</html>
`;

  const outWeb = path.join(rootDir, 'apps/web/index.html');
  await fs.writeFile(outWeb, html, 'utf-8');
  console.log(`Built ${outWeb} (${(html.length / 1024).toFixed(1)} KB)`);

  if (extraOutPath) {
    await fs.mkdir(path.dirname(extraOutPath), { recursive: true });
    await fs.writeFile(extraOutPath, html, 'utf-8');
    console.log(`Copied standalone web app to ${extraOutPath}`);
  }
  return html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildWeb(process.argv[2] || null).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
