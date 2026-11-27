/**
 * @fileoverview Single source of truth for CSV Rescue's 5 US-market GEO/SEO guides
 * and AI-crawler meta documents (robots.txt, sitemap.xml, llms.txt, llms-full.txt).
 * Shared by both `build-web.mjs` (in-app modal reader for standalone HTML / Canvas)
 * and `build-site.mjs` (multi-page static site for GitHub Pages / Cloudflare Pages).
 */

export const LASTMOD = '2026-11-27';

export const GUIDES = [
  {
    slug: 'fix-us-zip-codes-leading-zeros-csv',
    demoSample: 'broken',
    title: 'How to Fix Excel Stripping Leading Zeros from US ZIP Codes (02138, 07030) Offline',
    shortTitle: 'Fix Stripped Leading Zeros in US ZIP Codes',
    description:
      'Stop Excel from turning Boston (02138) and New Jersey (07030) ZIP codes into 4-digit numbers. Repair 5-digit and ZIP+4 postal codes 100% locally in your browser with zero uploads.',
    readTime: '3 min read',
    tag: 'US Postal & Shipping',
    quickAnswer:
      'Excel strips leading zeros from US ZIP codes (like 02138 in Massachusetts or 07030 in New Jersey) because it auto-casts raw CSV fields into integers on double-click. To repair them without uploading customer addresses, load the file into CSV Rescue locally, run Preserve Leading Zeros (5-digit or ZIP+4 text padding), and export as Excel SpreadsheetML (.xls) or UTF-8 BOM CSV.',
    storyHeading: 'The Boston 02138 Shipping Label Failure',
    storyParagraphs: [
      'A Northeast fulfillment coordinator exports 4,200 Shopify orders on Monday morning, opens the CSV in Excel to check one column, and hits Save. Ten minutes later, UPS WorldShip and ShipStation reject 680 Massachusetts, Connecticut, New Jersey, Maine, and Puerto Rico shipments with "Invalid Postal Code."',
      'Excel did not throw a single warning. It quietly converted "02138" into 2138, "07030" into 7030, and "02108-1234" into mangled strings. If you are dealing with real customer home addresses, uploading that file to a random web-based CSV fixer creates an unnecessary PII leak.',
    ],
    beforeAfter: [
      { field: 'Cambridge, MA ZIP', before: '2138', after: '02138', note: 'Padded to 5-digit string' },
      { field: 'Hoboken, NJ ZIP', before: '7030', after: '07030', note: 'Leading zero restored' },
      { field: 'Boston ZIP+4', before: '2108-1234', after: '02108-1234', note: 'Prefix padded, +4 preserved' },
      { field: 'Chicago, IL ZIP', before: '60606', after: '60606', note: 'Unchanged (already 5 digits)' },
    ],
    steps: [
      'Open CSV Rescue locally in your browser (or drag your .csv / .xlsx file straight onto the dropzone). No bytes leave your computer.',
      'Check the Health Report: CSV Rescue automatically flags postal columns with leading-zero risk (LEADING_ZERO_RISK).',
      'Click "Preview" on the Preserve Leading Zeros rule to inspect Before/After samples, then apply it with one click (Ctrl+Z undoes instantly via compact patches).',
      'In Safe Export, choose Excel SpreadsheetML (.xls) if teammates will reopen the file in Excel—every cell is explicitly typed as String so Excel can never drop the zeros again—or UTF-8 CSV with BOM for carrier portals.',
    ],
    boundaryNote:
      'Honest boundary: if a 5-digit ZIP code was corrupted into a completely different number or truncated from the right, no automated padding can invent missing digits. CSV Rescue only pads numeric 3–4 digit US postal codes (and 4-digit ZIP+4 prefixes) and lets you inspect every changed row before export.',
    faqs: [
      {
        q: 'Why does Excel delete the zero at the start of New England and New Jersey ZIP codes?',
        a: 'CSV is plain text with no column type metadata. When Excel opens a CSV via double-click, its General formatter parses digits as integers, silently discarding leading zeros.',
      },
      {
        q: 'Does CSV Rescue preserve ZIP+4 codes like 02108-1234?',
        a: 'Yes. CSV Rescue detects both 5-digit ZIP codes and ZIP+4 patterns (e.g., 2108-1234 → 02108-1234) without stripping the hyphen or suffix.',
      },
      {
        q: 'How do I stop Excel from breaking the ZIP codes again after I repair them?',
        a: 'Export using CSV Rescue’s Excel SpreadsheetML (.xls) preset, which writes explicit String cell types so Excel opens 02138 as text, or import the UTF-8 CSV via Excel Data → From Text/CSV with the column set to Text.',
      },
    ],
  },
  {
    slug: 'clean-csv-without-uploading-pii',
    demoSample: 'crm',
    title: 'How to Clean Customer PII CSV Files Without Uploading Them to the Cloud',
    shortTitle: 'Clean Customer PII CSVs Locally (Zero Upload)',
    description:
      'Repair CRM exports, payroll sheets, and healthcare or finance CSVs 100% locally in your browser or sandboxed Node.js MCP server. Zero cloud uploads and privacy-safe SHA-256 receipts.',
    readTime: '4 min read',
    tag: 'Privacy & Compliance',
    quickAnswer:
      'To clean spreadsheets containing customer emails, phone numbers, SSNs, or home addresses without triggering cloud data-leak risks, use a local-first tool that executes inside your browser tab or local CLI. CSV Rescue runs 100% offline with zero network calls, generates SHA-256 Repair Receipts that omit raw cell values, and sandboxes AI agent disk access via --allow-dir.',
    storyHeading: 'When Security Says "Do Not Paste That Into an Online CSV Tool"',
    storyParagraphs: [
      'Most free "online CSV cleaner" websites look convenient until you check the Network tab and realize your 25,000-row HubSpot export—complete with customer emails, phone numbers, order totals, and street addresses—just got POSTed to an unknown third-party server.',
      'For US finance teams, healthcare clinics, HR ops, and SaaS rev-ops working under SOC 2, HIPAA, or GDPR policies, cloud uploaders are a non-starter. Yet writing a one-off Python script every time a vendor sends a malformed file wastes hours and still risks silent bugs.',
    ],
    beforeAfter: [
      { field: 'Data Transfer', before: 'Uploaded to third-party cloud server', after: '0 bytes leave browser / localhost', note: 'Verified offline via file://' },
      { field: 'Audit Trail', before: 'Manual edits with no record', after: 'SHA-256 Repair Receipt (HTML/JSON)', note: 'Raw cell values omitted by default' },
      { field: 'Sensitive Columns', before: 'Unflagged SSN/email/phone fields', after: 'Automatic PII Privacy Notice', note: 'Flags email, phone, SSN, bank, address' },
      { field: 'AI Agent Access', before: 'Unrestricted shell / file access', after: '--allow-dir + fs.realpathSync sandbox', note: 'Blocks path traversal & symlink escape' },
    ],
    steps: [
      'Open CSV Rescue in your browser (you can even disconnect Wi-Fi or double-click the standalone csv-rescue.html locally—its pure-JS FIPS 180-4 SHA-256 works without HTTPS).',
      'Drop your sensitive CSV or .xlsx file. The Health Report immediately highlights detected PII columns (email, phone, SSN/EIN, address, bank/card) and reminds you that processing stays local.',
      'Review and apply deterministic fixes with Before/After previews, leaving any ambiguous records safely isolated in the Uncertainty Queue.',
      'Export your cleaned file along with a Privacy-Safe Repair Receipt (HTML or JSON) showing input/output SHA-256 hashes, row counts, and rules applied—with zero raw cell values leaked into the audit log.',
    ],
    boundaryNote:
      'Honest boundary: CSV Rescue’s SHA-256 Repair Receipt proves file integrity and documents every transformation, but hashing is an integrity check—not encryption. Store the exported CSV itself according to your organization’s local disk encryption policy.',
    faqs: [
      {
        q: 'Can I verify that CSV Rescue really makes zero network requests?',
        a: 'Yes. CSV Rescue has zero runtime npm dependencies and bundles its Web Worker inline as a local Blob. You can open DevTools → Network or turn on Airplane Mode and every feature still works.',
      },
      {
        q: 'Do Repair Receipts contain sensitive customer rows?',
        a: 'No. By default, both HTML and JSON Repair Receipts omit raw cell values completely and record only file metadata, SHA-256 hashes, row/column deltas, and the list of applied rules.',
      },
      {
        q: 'Is it safe to let an AI coding agent clean local CSVs via MCP?',
        a: 'CSV Rescue’s Stdio MCP server supports --allow-dir (and CSV_RESCUE_ALLOW_DIRS) with fs.realpathSync canonicalization, blocking both ../ traversal and symlink escapes outside your approved folder.',
      },
    ],
  },
  {
    slug: 'fix-utf8-mojibake-encoding-csv-offline',
    demoSample: 'broken',
    title: 'How to Fix Broken UTF-8 Mojibake (Ã©, â€™, Garbled Characters) in CSV Files Offline',
    shortTitle: 'Fix Broken UTF-8 Mojibake Encoding Offline',
    description:
      'Fix JosÃ©, smart-quote garbling (â€™), and legacy Windows-1252 or GB18030 CSV encoding errors locally. Includes honest U+FFFD loss detection and Excel UTF-8 BOM export.',
    readTime: '3 min read',
    tag: 'Encoding & Mojibake',
    quickAnswer:
      'CSV mojibake like "JosÃ©" or "donâ€™t" happens when a UTF-8 file is opened as Windows-1252 (ANSI) by Excel, or when a legacy GB18030/Shift_JIS export is read as UTF-8. CSV Rescue’s Encoding Detective inspects raw bytes read-only across 9 encodings, previews readable text side-by-side, and exports clean UTF-8 with BOM so Excel renders accents and CJK characters properly.',
    storyHeading: 'Decoding "JosÃ©" and "CafÃ©" Without Guessing Blindly',
    storyParagraphs: [
      'A US retail brand exports a customer list containing Spanish accents ("José García"), French product names ("Crème Brûlée"), smart quotes, and international supplier names. Someone opens the UTF-8 CSV in Windows Excel—and every accented name explodes into "JosÃ© GarcÃ­a" and "CrÃ¨me BrÃ»lÃ©e."',
      'Worse, if someone re-saves the broken file after replacement characters ( / U+FFFD) have already been baked into the bytes, most tools silently pretend they "fixed" it while permanently destroying customer names.',
    ],
    beforeAfter: [
      { field: 'Spanish Customer Name', before: 'JosÃ© GarcÃ­a (Win-1252 read)', after: 'José García (UTF-8 BOM)', note: 'Clean byte re-decoding' },
      { field: 'Smart Apostrophe', before: 'Oâ€™Connor', after: 'O’Connor', note: 'UTF-8 sequence restored' },
      { field: 'Legacy CJK Supplier', before: 'Garbled bytes (GB18030)', after: 'Readable UTF-8 Chinese', note: 'Auto-scored via Encoding Detective' },
      { field: 'Pre-existing U+FFFD', before: 'Caf (EF BF BD in bytes)', after: 'Flagged as Irrecoverable', note: 'Honest warning—never faked' },
    ],
    steps: [
      'Drop your garbled CSV into CSV Rescue. The raw file bytes remain read-only so you can test encodings safely.',
      'Open the Encoding Detective tab to compare ranked candidates (UTF-8 BOM, UTF-8, UTF-16 LE/BE, Windows-1252, ISO-8859-1, GB18030, Big5, Shift_JIS) with heuristic scores and live line previews.',
      'Click "Use" on the encoding that renders your names cleanly, and confirm delimiter/header settings if needed.',
      'Export using "CSV UTF-8 with BOM (Recommended for Excel)" so Excel on Windows and macOS automatically recognizes UTF-8 on double-click.',
    ],
    boundaryNote:
      'Honest boundary: if raw file bytes already contain literal UTF-8 replacement bytes (0xEF 0xBF 0xBD / ) from an earlier corrupted save, the original characters are gone from the file. CSV Rescue explicitly warns you instead of pretending re-encoding recovered them.',
    faqs: [
      {
        q: 'Why does Excel show Ã© even when my CSV is valid UTF-8?',
        a: 'Older and Windows versions of Excel assume a CSV without a UTF-8 Byte Order Mark (BOM) is encoded in the local Windows-1252 code page. Adding a UTF-8 BOM (EF BB BF) tells Excel to decode it as UTF-8.',
      },
      {
        q: 'Can CSV Rescue fix characters that already turned into black diamond question marks ()?',
        a: 'If the  appears only because the wrong decoder was selected, switching encodings in Encoding Detective fixes it. If 0xEF 0xBF 0xBD is already baked into the raw file bytes, those characters are irrecoverable and CSV Rescue flags that honestly.',
      },
      {
        q: 'Does changing encoding modify my original file on disk?',
        a: 'Never. CSV Rescue keeps your uploaded bytes read-only in memory and only writes a new cleaned file when you click Download.',
      },
    ],
  },
  {
    slug: 'fix-shopify-quickbooks-csv-import-errors',
    demoSample: 'broken',
    title: 'How to Fix Shopify, HubSpot & QuickBooks CSV Import Errors in Under 2 Minutes',
    shortTitle: 'Fix Shopify & QuickBooks CSV Import Errors',
    description:
      'Resolve column-count mismatches from unquoted street-address commas, broken quotes, mixed USD accounting negatives (($45.00)), ambiguous US dates, and repeated headers locally.',
    readTime: '4 min read',
    tag: 'E-Commerce & Finance',
    quickAnswer:
      'Most Shopify, HubSpot, and QuickBooks CSV import failures come from five structural bugs: unquoted commas inside US street addresses shifting columns, unclosed quotes swallowing rows, mixed currency formats ($1,250.50 vs ($45.00)), ambiguous MM/DD/YYYY vs DD/MM/YYYY dates, and duplicate rows. CSV Rescue isolates broken rows in an Uncertainty Queue and fixes deterministic issues with Before/After previews.',
    storyHeading: 'The 4:55 PM Friday Import Rejection Wall',
    storyParagraphs: [
      'You are five minutes from closing the week. You upload your vendor order sheet to Shopify or QuickBooks, and the importer throws a cryptic message: "Line 47: Expected 9 columns, got 10" or "Invalid amount format on row 184."',
      'Digging through a 30,000-row CSV in Notepad to find one missing quote or one unquoted comma in "742 Evergreen Ave, Boston MA" is brutal—and blindly running find-and-replace on commas will destroy the rest of the file.',
    ],
    beforeAfter: [
      { field: 'Unquoted Address Comma', before: '742 Evergreen Ave | Boston MA (10 cols)', after: '"742 Evergreen Ave, Boston MA" (9 cols)', note: 'Candidate merge in Uncertainty Queue' },
      { field: 'Accounting Negative USD', before: '($1,250.50) / 45.00-', after: '-1250.50 / -45.00', note: 'Clean numeric 2-decimal output' },
      { field: 'Mixed US & ISO Dates', before: 'Nov 27, 2026 & 04/03/2026', after: '2026-11-27 & 2026-04-03', note: 'Explicit MDY vs DMY confirmation' },
      { field: 'Unclosed Quote', before: '"Broken Quote User,devon@demo.us', after: 'Isolated on Line 9 (no row swallowing)', note: 'Editable inline or exported separately' },
    ],
    steps: [
      'Drop your failing CSV into CSV Rescue—or click "Broken Orders CSV" on the home screen to see a live US e-commerce example immediately.',
      'Review the Health Report: critical structural errors (ROW_WIDTH_MISMATCH, QUOTE_ERROR) are separated from safe fixes (blank rows, repeated headers, extra spaces).',
      'Click "Apply Safe Fixes Only" to clean deterministic noise in one click, then confirm currency normalization and MDY/DMY date order in Review Fixes.',
      'Open the Uncertainty Queue to accept, manually edit, or separately export the handful of genuinely broken rows—so 99.8% of your clean orders import on time.',
    ],
    boundaryNote:
      'Honest boundary: ambiguous dates like 04/03/2026 cannot be guessed mathematically (it could be April 3 in the US or March 4 in the UK/MY). CSV Rescue always asks you to confirm MDY vs DMY before converting to ISO YYYY-MM-DD.',
    faqs: [
      {
        q: 'Why does one unclosed quote break thousands of rows in standard CSV parsers?',
        a: 'Strict RFC 4180 parsers keep consuming newlines until they find a matching quote. CSV Rescue bounds multiline lookahead and isolates unclosed quotes on their exact source line so subsequent records stay intact.',
      },
      {
        q: 'Does CSV Rescue handle QuickBooks accounting negative amounts like ($45.00) or 45.00-?',
        a: 'Yes. The normalize_currency rule recognizes parenthesized negatives, trailing minus signs, commas, and US/international currency symbols, converting them to standard numeric decimals like -45.00.',
      },
      {
        q: 'Can I map messy vendor headers like "Item Desc" and "Unit Price" to a standard schema?',
        a: 'Yes. Open Mapping Studio to match columns against built-in E-commerce, CRM, Marketing, or Finance packs and save a Supplier Memory template that detects schema drift next month.',
      },
    ],
  },
  {
    slug: 'convert-multi-sheet-xlsx-to-clean-csv-offline',
    demoSample: 'vendor',
    title: 'How to Convert Multi-Sheet Excel (.xlsx) Files to Clean, Safe CSV Offline',
    shortTitle: 'Convert Multi-Sheet .xlsx to Clean CSV Locally',
    description:
      'Inspect multi-tab .xlsx workbooks, switch sheets, repair dirty columns, and export OWASP formula-safe UTF-8 CSV 100% locally in your browser or Node.js CLI with zero dependencies.',
    readTime: '3 min read',
    tag: 'Excel (.xlsx) & Security',
    quickAnswer:
      'CSV Rescue includes a zero-dependency native .xlsx (OOXML) reader powered by the browser’s built-in DecompressionStream and Node’s node:zlib. Drop any multi-sheet Excel workbook to switch tabs, clean formatting issues, neutralize OWASP CSV formula injection (=, +, -, @), and export clean UTF-8 CSV or JSON without uploading a single byte.',
    storyHeading: 'When Vendors Send 4-Tab .xlsx Workbooks Instead of CSV',
    storyParagraphs: [
      'You asked for a clean CSV. The supplier sent an Excel .xlsx workbook with four tabs ("Summary", "US_Orders", "Returns", "Notes"), merged blank rows, inconsistent phone numbers, and an accidental =HYPERLINK() formula lurking in the notes column.',
      'Opening it in desktop Excel just to Save As CSV loses leading zeros, silently flattens encodings, and leaves formula-injection payloads intact for whoever opens the file next.',
    ],
    beforeAfter: [
      { field: 'Multi-Sheet Workbook', before: '4 tabs in vendor_q4.xlsx', after: 'Select "US_Orders" via Sheet Switcher', note: 'Works in Web UI, CLI --sheet & MCP' },
      { field: 'Formula Injection Cell', before: '=HYPERLINK("http://evil.example","Click")', after: '\'=HYPERLINK("http://evil.example","Click")', note: 'OWASP prefix_quote or prefix_tab guard' },
      { field: 'Sparse Empty Cells', before: 'Skipped XML <c> nodes', after: 'Exact column alignment via A1 coords', note: 'Empty cells never shift columns left' },
      { field: 'Leading-Zero Text Cells', before: 'String "02138" in sharedStrings.xml', after: 'Preserved as "02138"', note: 'Never cast to integer' },
    ],
    steps: [
      'Drag your .xlsx workbook directly onto CSV Rescue in the browser (or run `node apps/cli/csv-rescue.mjs diagnose file.xlsx --sheet US_Orders` in Node.js 18+).',
      'Use the Sheet Switcher dropdown in the top file bar to inspect any tab in the workbook.',
      'Run diagnostics and apply deterministic cleaning rules (trim, deduplicate, normalize dates/phones/currency) with live Health Score feedback.',
      'In Safe Export, leave OWASP Formula Injection Protection enabled (prefix_quote or prefix_tab) and download your clean UTF-8 BOM CSV, standard CSV, TSV, or JSON.',
    ],
    boundaryNote:
      'Honest boundary: CSV Rescue’s zero-dependency .xlsx reader targets standard OOXML spreadsheets (shared strings, inline strings, numbers, booleans, and cached/raw formula values). Password-encrypted workbooks and legacy binary .xls (BIFF8) files should be decrypted or saved as .xlsx/.csv first.',
    faqs: [
      {
        q: 'Does CSV Rescue need SheetJS or heavy third-party libraries to read .xlsx files?',
        a: 'No. CSV Rescue parses ZIP central directories and OOXML worksheets natively using DecompressionStream("deflate-raw") in modern browsers and built-in node:zlib in Node.js 18+.',
      },
      {
        q: 'What is OWASP CSV Formula Injection and why does it matter?',
        a: 'Cells starting with =, +, -, or @ can be executed as formulas when opened in Excel or LibreOffice. CSV Rescue flags risky cells (while allowing harmless negative numbers like -42.50 and international phones like +1 415-555-0198) and offers optional prefix escaping on export.',
      },
      {
        q: 'Can AI agents inspect multi-sheet .xlsx files through CSV Rescue MCP?',
        a: 'Yes. Pass sheetName to csv_inspect, csv_preview_pipeline, or csv_execute_pipeline and the MCP server reads the requested worksheet directly inside your sandboxed directory.',
      },
    ],
  },
];

export function buildRobotsTxt(siteUrl) {
  return `# CSV Rescue robots.txt — Explicitly welcomes search engines & AI search citation crawlers
User-agent: *
Allow: /

# Major Search & AI Search Indexing Crawlers
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
# AI Agent & LLM Index: ${siteUrl}/llms.txt
`;
}

export function buildSitemapXml(siteUrl) {
  const urls = [
    { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'weekly' },
    ...GUIDES.map((g) => ({
      loc: `${siteUrl}/guides/${g.slug}/`,
      priority: '0.85',
      changefreq: 'monthly',
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

export function buildLlmsTxt(siteUrl) {
  return `# CSV Rescue

> Local-first, zero-upload CSV and native Excel (.xlsx) repair workbench (v2.4.0, MIT License) built for US operations teams and AI agents. Runs 100% locally in the browser (inline Web Worker + 34px Virtual Scroll), Node.js 18+ CLI, ESM SDK, and a zero-dependency Stdio MCP Server with --allow-dir path sandboxing.

## Core Workbench & Verified Benchmarks

- [CSV Rescue Web Workbench](${siteUrl}/): 100% browser-local CSV/TSV/XLSX repair workspace with Before/After Repair Evidence, Uncertainty Queue, OWASP CSV Formula Injection protection, and privacy-safe SHA-256 Repair Receipts.
- [Full Technical & Narrative Reference (llms-full.txt)](${siteUrl}/llms-full.txt): Complete single-file reference covering benchmarks, all 17 repair rules, MCP server tools, CLI flags, and US spreadsheet repair FAQs.

## Step-by-Step Repair Guides (US Business Workflows)

${GUIDES.map((g) => `- [${g.title}](${siteUrl}/guides/${g.slug}/): ${g.description}`).join('\n')}

## AI Agent & MCP Server Quickstart

- Start Stdio MCP Server (zero runtime dependencies): \`node apps/mcp-server/index.mjs --allow-dir /path/to/data\`
- 4 token-efficient MCP tools: \`csv_inspect\`, \`csv_preview_pipeline\`, \`csv_execute_pipeline\`, \`csv_diff_or_merge\`
- O(1) constant-memory disk streaming (CLI/MCP): 500,000 rows (45.46 MB) diagnosed in ~1.1–1.25 s at <20 MB heap RAM.
- Native multi-sheet \`.xlsx\` reader: works in browsers (\`DecompressionStream('deflate-raw')\`) and Node.js 18+ (\`node:zlib\`).
`;
}

export function buildLlmsFullTxt(siteUrl) {
  return `# CSV Rescue — Complete Technical & Editorial Reference (llms-full.txt)

> Version: 2.4.0 · License: MIT · Runtime Dependencies: 0 · Privacy: 100% Local-First (Zero Cloud Uploads)
> Primary URL: ${siteUrl}/

## 1. Why CSV Rescue Exists (Product Story)

US e-commerce, finance, CRM, and operations teams routinely deal with broken CSV and multi-sheet .xlsx exports right before deadlines: Excel silently strips leading zeros from Northeast US ZIP codes (02138 → 2138, 07030 → 7030), mangles UTF-8 accents into mojibake (JosÃ©), splits unquoted street addresses across extra columns, and exposes teams to OWASP formula injection (=HYPERLINK, @SUM). Because those files contain customer PII, uploading them to ad-hoc cloud converters violates SOC 2, HIPAA, or GDPR policies.

CSV Rescue solves this with three non-negotiable rules:
1. **100% Local-First**: Original bytes stay read-only on the user's device. Pure-JS FIPS 180-4 SHA-256 works even offline via \`file://\`.
2. **Evidence Before Edits**: Every fix shows Before/After samples, affected row counts, risk level, and supports instant O(affected cells) inverse-patch Ctrl+Z Undo.
3. **Uncertainty Queue (Never Guess Silently)**: Broken quotes, unquoted address commas, invalid emails, and ambiguous dates are isolated for human review—or exported as an offline interactive HTML review page when triggered by an AI agent via MCP.

## 2. Verified Local Benchmarks

- **100,000 rows (8.46 MB) in-memory streaming**: parse ~488 ms, full diagnostics ~622 ms, incremental 1-column re-diagnosis ~45 ms (**13.7x** speedup; **23.7x** on 20k rows), compact patch undo ~1.6 ms, AbortController cancel ~2.8 ms.
- **500,000 rows (45.46 MB) O(1) disk-streaming (\`diagnoseCsvFileStreaming\`)**: ~1.12–1.25 s (~400k–444k rows/sec) at **15.8–29 MB** heap RAM.
- **Public 10-Case CSV Torture Suite (\`npm run torture\`)**: 10/10 PASS.
- **Automated Test Suite (\`npm test\`)**: 30/30 tests passing.

## 3. MCP Server & AI Agent API (\`apps/mcp-server/index.mjs\`)

Start the zero-dependency Stdio MCP Server:
\`\`\`bash
node apps/mcp-server/index.mjs --allow-dir /path/to/your/data
\`\`\`

### MCP Tools
1. \`csv_inspect({ filePath?, csvText?, sheetName?, encoding?, delimiter?, maxSamples? })\`
2. \`csv_preview_pipeline({ filePath?, csvText?, sheetName?, rules, maxSamples? })\`
3. \`csv_execute_pipeline({ filePath?, csvText?, sheetName?, rules, outPath?, format?, formulaProtection?, receiptPath?, reviewHtmlPath? })\`
4. \`csv_diff_or_merge({ mode: "diff" | "merge", filePaths?, csvTexts?, keyColumn?, dedupeKey?, outPath? })\`

## 4. US-Market Repair Guides & Direct Answers

${GUIDES.map(
  (g, idx) => `### 4.${idx + 1} ${g.title}
URL: ${siteUrl}/guides/${g.slug}/
Direct Answer: ${g.quickAnswer}
Boundary: ${g.boundaryNote}`
).join('\n\n')}
`;
}
