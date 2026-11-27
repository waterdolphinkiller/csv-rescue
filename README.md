# CSV Rescue v2.0


https://github.com/user-attachments/assets/1911cc1f-baf8-49e4-8b3e-21b92427e7d2


![CSV Rescue Demo](docs/media/csv-rescue-demo.gif)

> **Fix messy CSV files without guessing.**  
> A local-first CSV repair and data-cleaning workspace for people who work with spreadsheets, not code — powered by a v2.0 plugin-extensible streaming & incremental engine.

**Core workflow:** `Diagnose → Explain → Preview → Repair → Verify → Export`

---

## What's New in v2.0 Engine

1. **Plugin Registry Architecture (`packages/plugin-registry`)**: Register custom diagnostics (`registerDiagnostic`), custom repair rules with declarative parameter schema validation (`registerRule`), custom Region Packs (`registerRegionPack` — built-in `MY`, `SG`, `US`, `CN`), Business Data Packs (`registerBusinessPack`), and NL Plan Providers (`registerPlanProvider`) without touching core source files.
2. **Web Worker Streaming & Cancellable Kernel**: Chunked streaming CSV parser (`parseCsvStream`) with native `AbortSignal` support and an inline background Web Worker in the browser with live progress & instant cancel.
3. **Incremental Column-Scoped Diagnostics (`runDiagnosticsIncremental`)**: When a cleaning rule edits specific columns (e.g. lowercasing emails, normalizing dates or phones), CSV Rescue only re-profiles and re-scans those dirty columns instead of rescanning the entire table (**13.7x–23.7x faster**).
4. **Compact Patch-Based Undo/Redo (`applyInversePatch`)**: Records compact cell/row inverse patches instead of deep-cloning 100,000 rows on every edit (**1.6 ms** undo on 100k rows).
5. **True Fixed-Row-Height Virtual Scrolling Grid**: Smoothly scrolls through 100,000+ rows while rendering only ~30 DOM rows in the viewport.

---

## Reproducible Local Benchmarks (Node.js 18, `npm run benchmark`)

| Dataset | Rows | File Size | Stream Parse | Full Diagnostics | Incremental 1-Col Re-Diag | Speedup | Rule Apply | Patch Undo |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S1 (1k) | 1,000 | 80.9 KB | 27.5 ms | 16.5 ms | 1.0 ms | **16.8x** | 1.8 ms | 0.3 ms |
| S2 (20k) | 20,000 | 1.67 MB | 140.8 ms | 192.7 ms | 8.1 ms | **23.7x** | 4.4 ms | 0.8 ms |
| M1 (100k) | 100,000 | 8.46 MB | 487.6 ms | 621.8 ms | 45.3 ms | **13.7x** | 14.9 ms | 1.6 ms |

- **Mid-stream `AbortController` cancellation on 100,000 rows:** `2.76 ms` (target ≤ 500 ms).
- Re-run on your own machine anytime via `npm run benchmark`.

---

## Quick Start

### 1. Open the Local Web App (Zero Build / Zero Server)
Open `apps/web/index.html` directly in any modern browser. Try the 3 built-in samples (**Broken Orders**, **Vendor Products**, **CRM Contacts**) or click **100k-Row Stress Test** to test Web Worker streaming + Virtual Scrolling live.

### 2. Run Automated Tests & Benchmarks (Node.js 18+)
```bash
npm test
npm run benchmark
npm run build:web
```

### 3. Extend with Custom Plugins
```js
import { defaultRegistry } from './packages/plugin-registry/index.mjs';

defaultRegistry.registerRegionPack({
  id: 'ID',
  name: 'Indonesia',
  dialCode: '+62',
  normalizePhone(cleaned) {
    return cleaned.startsWith('08') ? `+62${cleaned.slice(1)}` : null;
  },
});
```

### 4. Local CLI
```bash
node apps/cli/csv-rescue.mjs diagnose fixtures/malformed/broken_orders.csv
node apps/cli/csv-rescue.mjs clean fixtures/malformed/broken_orders.csv \
  --out cleaned.csv --remove-blanks --trim --dedupe \
  --formula-protect prefix_quote --receipt receipt.html
```

---

## AI-Friendly Agent API & Zero-Dependency MCP Server

CSV Rescue ships with a token-efficient Agent SDK (`packages/agent-api`), a zero-dependency Stdio **MCP Server** (`apps/mcp-server/index.mjs`), CLI `--agent` mode, and `llms.txt`:

- **4 MCP Tools:** `csv_inspect`, `csv_preview_pipeline` (pure `dryRun`), `csv_execute_pipeline`, `csv_diff_or_merge`
- **Token-Efficient:** Bounded sample counts keep `csv_inspect` under ~5 KB even on 20,000+ row CSVs.
- **Self-Healing Errors:** Invalid `ruleId` or column names return `validRuleIds`, `validColumns`, and `closestMatch` so agents self-correct in one retry.

```json
{
  "mcpServers": {
    "csv-rescue": {
      "command": "node",
      "args": ["/path/to/csv-rescue/apps/mcp-server/index.mjs"]
    }
  }
}
```

---

## License

MIT License — see [LICENSE](./LICENSE).
