/**
 * @fileoverview Shared types, constants, and data structures for CSV Rescue v2.0.
 * Zero-dependency ES Module compatible with Browser (HTTPS, file://, Web Worker) and Node.js 18+.
 */

export const CSV_RESCUE_VERSION = '2.4.0';

/** @typedef {'critical' | 'high' | 'warning' | 'info'} IssueSeverity */
/** @typedef {'low' | 'medium' | 'high'} RiskLevel */
/** @typedef {'high' | 'medium' | 'low'} ConfidenceLevel */
/** @typedef {'safe_fix' | 'suggested_fix' | 'unresolved'} RepairTier */
/** @typedef {'exact' | 'alias' | 'inferred' | 'manual'} MappingMatchType */

export const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  warning: 2,
  info: 3,
};

export const SUPPORTED_ENCODINGS = [
  { id: 'utf-8-bom', label: 'UTF-8 with BOM', decoder: 'utf-8', stripBom: true },
  { id: 'utf-8', label: 'UTF-8', decoder: 'utf-8', stripBom: false },
  { id: 'utf-16le', label: 'UTF-16 LE', decoder: 'utf-16le', stripBom: true },
  { id: 'utf-16be', label: 'UTF-16 BE', decoder: 'utf-16be', stripBom: true },
  { id: 'windows-1252', label: 'Windows-1252', decoder: 'windows-1252', stripBom: false },
  { id: 'iso-8859-1', label: 'ISO-8859-1', decoder: 'iso-8859-1', stripBom: false },
  { id: 'gb18030', label: 'GB18030 (Simplified Chinese)', decoder: 'gb18030', stripBom: false },
  { id: 'big5', label: 'Big5 (Traditional Chinese)', decoder: 'big5', stripBom: false },
  { id: 'shift_jis', label: 'Shift_JIS (Japanese)', decoder: 'shift_jis', stripBom: false },
];

export const DELIMITER_OPTIONS = [
  { id: ',', label: 'Comma (,)', char: ',' },
  { id: ';', label: 'Semicolon (;)', char: ';' },
  { id: '\t', label: 'Tab (\\t)', char: '\t' },
  { id: '|', label: 'Pipe (|)', char: '|' },
];

export const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t=', '\r='];

export const SENSITIVE_COLUMN_PATTERNS = [
  { type: 'email', regex: /(?:^|[\s_-])(e[-_]?mail|邮箱)(?:$|[\s_-])/i },
  { type: 'phone', regex: /(?:^|[\s_-])(phone|mobile|cell|tel|whatsapp|电话|手机)(?:$|[\s_-])/i },
  { type: 'id_number', regex: /(?:^|[\s_-])(ic|nric|passport|ssn|ein|dob|birth[_\s-]?date|national[_-]?id|身份证|护照)(?:$|[\s_-])/i },
  { type: 'financial', regex: /(?:^|[\s_-])(bank|iban|routing|credit[_\s-]?card|card|account[_-]?no|salary|银行|账号)(?:$|[\s_-])/i },
  { type: 'address', regex: /(?:^|[\s_-])(address|street|home|地址)(?:$|[\s_-])/i },
];

/**
 * Pure-JS FIPS 180-4 SHA-256 fallback for insecure contexts (e.g. local file:// double-click)
 * where browser `crypto.subtle` is unavailable.
 * @param {Uint8Array} data
 * @returns {string}
 */
function sha256Fallback(data) {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const len = data.length;
  const bitLenHi = Math.floor((len * 8) / 0x100000000);
  const bitLenLo = (len * 8) >>> 0;
  const paddedLen = ((len + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(paddedLen);
  buf.set(data);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(paddedLen - 8, bitLenHi, false);
  dv.setUint32(paddedLen - 4, bitLenLo, false);

  const W = new Uint32Array(64);
  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = ((W[i - 15] >>> 7) | (W[i - 15] << 25)) ^ ((W[i - 15] >>> 18) | (W[i - 15] << 14)) ^ (W[i - 15] >>> 3);
      const s1 = ((W[i - 2] >>> 17) | (W[i - 2] << 15)) ^ ((W[i - 2] >>> 19) | (W[i - 2] << 13)) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return Array.from(H).map((x) => x.toString(16).padStart(8, '0')).join('');
}

/**
 * Compute SHA-256 hex digest of a Uint8Array in Browser (SubtleCrypto or pure-JS fallback) and Node.js.
 * @param {Uint8Array} bytes
 * @returns {Promise<string>}
 */
export async function sha256Hex(bytes) {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return sha256Fallback(bytes);
}

/**
 * Convert string to UTF-8 Uint8Array.
 * @param {string} str
 * @returns {Uint8Array}
 */
export function encodeUtf8(str) {
  return new TextEncoder().encode(str);
}

/**
 * Format byte count into human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Deep clone plain JSON-safe structures.
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}
