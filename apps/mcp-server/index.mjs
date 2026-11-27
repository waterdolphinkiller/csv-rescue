#!/usr/bin/env node
/**
 * @fileoverview Zero-Dependency CSV Rescue MCP Server (Model Context Protocol over Stdio).
 * Works directly with Claude Desktop, Cursor, Gemini CLI, and any JSON-RPC 2.0 MCP client.
 *
 * Exposes 4 token-efficient, self-healing tools:
 *   - csv_inspect
 *   - csv_preview_pipeline
 *   - csv_execute_pipeline
 *   - csv_diff_or_merge
 */

import readline from 'node:readline';
import {
  AGENT_TOOL_SCHEMAS,
  csvInspect,
  csvPreviewPipeline,
  csvExecutePipeline,
  csvDiffOrMerge,
} from '../../packages/agent-api/index.mjs';
import { CSV_RESCUE_VERSION } from '../../packages/shared-types/index.mjs';

const SERVER_INFO = {
  name: 'csv-rescue-mcp',
  version: CSV_RESCUE_VERSION,
};

const PROTOCOL_VERSION = '2024-11-05';

function parseAllowedDirs() {
  const dirs = [];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--allow-dir' && argv[i + 1]) {
      dirs.push(argv[i + 1]);
      i++;
    } else if (argv[i].startsWith('--allow-dir=')) {
      dirs.push(argv[i].slice('--allow-dir='.length));
    }
  }
  if (process.env.CSV_RESCUE_ALLOW_DIRS) {
    for (const d of process.env.CSV_RESCUE_ALLOW_DIRS.split(',')) {
      if (d.trim()) dirs.push(d.trim());
    }
  }
  return dirs.length > 0 ? dirs : null;
}

const ALLOWED_DIRS = parseAllowedDirs();

function sendJsonRpc(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function handleToolCall(name, rawArgs) {
  const args = { ...(rawArgs || {}), allowedDirs: ALLOWED_DIRS };
  switch (name) {
    case 'csv_inspect':
      return await csvInspect(args);
    case 'csv_preview_pipeline':
      return await csvPreviewPipeline(args);
    case 'csv_execute_pipeline':
      return await csvExecutePipeline(args);
    case 'csv_diff_or_merge':
      return await csvDiffOrMerge(args);
    default:
      return {
        ok: false,
        errorCode: 'UNKNOWN_TOOL',
        message: `Unknown tool "${name}".`,
        selfHealing: { validTools: AGENT_TOOL_SCHEMAS.map((t) => t.name) },
      };
  }
}

async function handleMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  const { id, method, params } = msg;

  // Notifications have no id and expect no response
  if (id === undefined || id === null) {
    return;
  }

  try {
    if (method === 'initialize') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      });
      return;
    }

    if (method === 'ping') {
      sendJsonRpc({ jsonrpc: '2.0', id, result: {} });
      return;
    }

    if (method === 'tools/list') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: { tools: AGENT_TOOL_SCHEMAS },
      });
      return;
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const out = await handleToolCall(toolName, toolArgs);
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(out, null, 2) }],
          isError: out?.ok === false,
        },
      });
      return;
    }

    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (err) {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err?.message || String(err) },
    });
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed);
    handleMessage(parsed);
  } catch (err) {
    sendJsonRpc({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: `Parse error: ${err.message}` },
    });
  }
});
