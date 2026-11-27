import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  csvInspect,
  csvPreviewPipeline,
  csvExecutePipeline,
  csvDiffOrMerge,
} from '../packages/agent-api/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('Agent API: csvInspect stays token-efficient even on 20,000-row CSV', async () => {
  const lines = ['order_id,email,phone,amount'];
  for (let i = 1; i <= 20000; i++) {
    lines.push(`ORD-${i},USER${i}@EXAMPLE.MY,0123456789,RM 120.00`);
  }
  const res = await csvInspect({ csvText: lines.join('\n'), maxSamples: 3 });
  assert.equal(res.ok, true);
  assert.equal(res.file.rows, 20000);
  const serializedLen = JSON.stringify(res).length;
  // Compact token budget check: even for 20k rows with 20k affected cells, output stays < 5KB!
  assert.ok(serializedLen < 5000, `Expected compact payload < 5000 chars, got ${serializedLen}`);
  assert.ok(Array.isArray(res.suggestedSafePipeline));
});

test('Agent API: column-name resolution, dryRun preview, self-healing errors & safe execution', async () => {
  const csv = [
    'order_id,email,phone,notes',
    '1, ALICE@DEMO.MY ,012-3456789,=HYPERLINK("http://evil")',
    ',,,',
    '2,bob@demo.my,0198887777,ok',
  ].join('\n');

  // 1. Self-healing error on unknown ruleId
  const badRule = await csvPreviewPipeline({
    csvText: csv,
    rules: [{ ruleId: 'magic_ai_fix' }],
  });
  assert.equal(badRule.ok, false);
  assert.equal(badRule.errorCode, 'INVALID_RULE_ID');
  assert.ok(Array.isArray(badRule.selfHealing.validRuleIds));

  // 2. Self-healing error on typo column name
  const badCol = await csvPreviewPipeline({
    csvText: csv,
    rules: [{ ruleId: 'lowercase_column', params: { column: 'e-mail_typo' } }],
  });
  assert.equal(badCol.ok, false);
  assert.equal(badCol.errorCode, 'INVALID_COLUMN');
  assert.deepEqual(badCol.selfHealing.validColumns, ['order_id', 'email', 'phone', 'notes']);

  // 3. Valid dryRun using column NAMES ("email", "phone")
  const preview = await csvPreviewPipeline({
    csvText: csv,
    rules: [
      { ruleId: 'remove_blank_rows' },
      { ruleId: 'trim_whitespace' },
      { ruleId: 'lowercase_column', params: { column: 'email' } },
      { ruleId: 'normalize_phone', params: { column: 'phone', region: 'MY', preserveOriginal: true } },
    ],
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.dryRun, true);
  assert.equal(preview.rowsBefore, 3);
  assert.equal(preview.rowsAfter, 2);

  // 4. Execute with OWASP formula protection
  const exec = await csvExecutePipeline({
    csvText: csv,
    rules: [
      { ruleId: 'remove_blank_rows' },
      { ruleId: 'trim_whitespace' },
      { ruleId: 'lowercase_column', params: { column: 'email' } },
    ],
    format: 'csv',
    formulaProtection: 'prefix_quote',
  });
  assert.equal(exec.ok, true);
  assert.equal(exec.formulaProtectedCells, 1);
  assert.ok(exec.outputText.includes("'=HYPERLINK"));
});

test('Agent API: csvDiffOrMerge compares and merges cleanly', async () => {
  const diff = await csvDiffOrMerge({
    mode: 'diff',
    csvTexts: ['sku,price\nS1,10\nS2,20\n', 'sku,price\nS1,12\nS3,30\n'],
    keyColumn: 'sku',
  });
  assert.equal(diff.ok, true);
  assert.equal(diff.summary.modifiedCount, 1);
  assert.equal(diff.summary.addedCount, 1);
  assert.equal(diff.summary.removedCount, 1);

  const merged = await csvDiffOrMerge({
    mode: 'merge',
    csvTexts: ['sku,price,warehouse\nS1,10,KL\n', 'sku,price,currency\nS1,10,MYR\nS2,20,MYR\n'],
    dedupeKey: 'sku',
  });
  assert.equal(merged.ok, true);
  assert.equal(merged.isSchemaIdentical, false);
  assert.equal(merged.totalOutputRows, 2);
  assert.equal(merged.crossFileDuplicatesRemoved, 1);
});

test('MCP Server: end-to-end JSON-RPC Stdio handshake, tools/list, csv_inspect & self-healing tool call', async () => {
  const serverPath = path.join(rootDir, 'apps/mcp-server/index.mjs');
  const child = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });

  const responses = new Map();
  let buf = '';
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf-8');
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.id !== undefined) responses.set(msg.id, msg);
    }
  });

  const rpc = (id, method, params = {}) =>
    new Promise((resolve, reject) => {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      const start = Date.now();
      const iv = setInterval(() => {
        if (responses.has(id)) {
          clearInterval(iv);
          resolve(responses.get(id));
        } else if (Date.now() - start > 3000) {
          clearInterval(iv);
          reject(new Error(`Timeout waiting for MCP response id=${id}`));
        }
      }, 15);
    });

  try {
    const init = await rpc(1, 'initialize', { clientInfo: { name: 'test-client', version: '1.0' } });
    assert.equal(init.result.serverInfo.name, 'csv-rescue-mcp');

    const list = await rpc(2, 'tools/list');
    assert.equal(list.result.tools.length, 4);
    assert.deepEqual(
      list.result.tools.map((t) => t.name),
      ['csv_inspect', 'csv_preview_pipeline', 'csv_execute_pipeline', 'csv_diff_or_merge']
    );

    const inspectCall = await rpc(3, 'tools/call', {
      name: 'csv_inspect',
      arguments: { filePath: path.join(rootDir, 'fixtures/malformed/broken_orders.csv') },
    });
    assert.equal(inspectCall.result.isError, false);
    const parsedOut = JSON.parse(inspectCall.result.content[0].text);
    assert.equal(parsedOut.ok, true);
    assert.ok(parsedOut.summary.totalIssues >= 5);

    const badCall = await rpc(4, 'tools/call', {
      name: 'csv_preview_pipeline',
      arguments: {
        csvText: 'id,email\n1,a@b.com\n',
        rules: [{ ruleId: 'nonexistent_rule' }],
      },
    });
    assert.equal(badCall.result.isError, true);
    const badOut = JSON.parse(badCall.result.content[0].text);
    assert.equal(badOut.errorCode, 'INVALID_RULE_ID');
    assert.ok(badOut.selfHealing.validRuleIds.includes('trim_whitespace'));
  } finally {
    child.kill();
  }
});

test('MCP Security Sandbox (--allow-dir) & Human-in-the-Loop Review HTML generation (v2.2)', async () => {
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-rescue-sandbox-'));
  const serverPath = path.join(rootDir, 'apps/mcp-server/index.mjs');
  const fixturesDir = path.join(rootDir, 'fixtures');

  // Launch MCP Server strictly confined to fixturesDir and tmpDir
  const child = spawn(
    process.execPath,
    [serverPath, '--allow-dir', fixturesDir, '--allow-dir', tmpDir],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  );

  const responses = new Map();
  let buf = '';
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf-8');
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.id !== undefined) responses.set(msg.id, msg);
    }
  });

  const rpc = (id, method, params = {}) =>
    new Promise((resolve, reject) => {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      const start = Date.now();
      const iv = setInterval(() => {
        if (responses.has(id)) {
          clearInterval(iv);
          resolve(responses.get(id));
        } else if (Date.now() - start > 3000) {
          clearInterval(iv);
          reject(new Error(`Timeout waiting for MCP response id=${id}`));
        }
      }, 15);
    });

  try {
    // 1. Attempt path traversal outside sandbox -> MUST BE BLOCKED!
    const blocked = await rpc(10, 'tools/call', {
      name: 'csv_inspect',
      arguments: { filePath: path.join(fixturesDir, '..', 'package.json') },
    });
    assert.equal(blocked.result.isError, true);
    const blockedOut = JSON.parse(blocked.result.content[0].text);
    assert.equal(blockedOut.errorCode, 'PATH_OUTSIDE_SANDBOX');
    assert.ok(Array.isArray(blockedOut.selfHealing.allowedDirs));

    // 2. Execute 95% deterministic cleaning inside sandbox & generate Human-in-the-Loop HTML review page
    const outCsv = path.join(tmpDir, 'cleaned.csv');
    const reviewHtml = path.join(tmpDir, 'human_review.html');
    const exec = await rpc(11, 'tools/call', {
      name: 'csv_execute_pipeline',
      arguments: {
        filePath: path.join(fixturesDir, 'malformed/broken_orders.csv'),
        rules: [
          { ruleId: 'remove_blank_rows' },
          { ruleId: 'remove_repeated_headers' },
          { ruleId: 'trim_whitespace' },
          { ruleId: 'deduplicate_exact' },
        ],
        outPath: outCsv,
        reviewHtmlPath: reviewHtml,
        formulaProtection: 'prefix_quote',
      },
    });
    assert.equal(exec.result.isError, false);
    const execOut = JSON.parse(exec.result.content[0].text);
    assert.equal(execOut.ok, true);
    assert.equal(execOut.reviewHtmlPath, reviewHtml);
    assert.ok(execOut.uncertaintyQueueCount > 0);

    // Verify generated HTML review page exists and contains valid inline JS
    const htmlContent = await fs.readFile(reviewHtml, 'utf-8');
    assert.ok(htmlContent.includes('Human-in-the-Loop Review'));
    assert.ok(htmlContent.includes('Export Resolved Rows CSV'));
    const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch);
    new Function(scriptMatch[1]);
  } finally {
    child.kill();
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
