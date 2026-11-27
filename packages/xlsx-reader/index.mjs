/**
 * @fileoverview Zero-Dependency Native .xlsx (OOXML) Workbook Reader (v2.3).
 * Works in both Node.js 18+ (via built-in `node:zlib`) and Modern Browsers
 * (via built-in `DecompressionStream('deflate-raw')`).
 *
 * Supports:
 * - Multi-sheet workbooks (`listXlsxSheets`, `readXlsxWorkbook`)
 * - Shared strings (`xl/sharedStrings.xml`), inline strings (`t="inlineStr"`),
 *   booleans (`t="b"`), numbers, and cached formula values
 * - Sparse cell coordinate decoding (`A1`, `AA12`) so empty cells never shift columns
 * - Preserves leading zeros on string-formatted ZIP codes, IDs, and phone numbers
 */

/**
 * Check whether raw bytes start with ZIP / XLSX magic header (`PK\x03\x04`).
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function isXlsxBytes(bytes) {
  return Boolean(
    bytes &&
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
  );
}

/**
 * Inflate raw DEFLATE bytes using Browser DecompressionStream or Node.js node:zlib.
 * @param {Uint8Array} compressed
 * @returns {Promise<Uint8Array>}
 */
async function inflateRaw(compressed) {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const { inflateRawSync } = await import('node:zlib');
    return new Uint8Array(inflateRawSync(compressed));
  }
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressed);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }
  const { inflateRawSync } = await import('node:zlib');
  return new Uint8Array(inflateRawSync(compressed));
}

/**
 * Parse ZIP Central Directory and extract requested entry names as UTF-8 strings.
 * @param {Uint8Array} bytes
 * @returns {Promise<Map<string, Uint8Array>>}
 */
async function unzipEntries(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Locate End of Central Directory (EOCD) signature 0x06054b50 from end
  let eocdOff = -1;
  const minOff = Math.max(0, bytes.length - 65558);
  for (let i = bytes.length - 22; i >= minOff; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocdOff = i;
      break;
    }
  }
  if (eocdOff < 0) throw new Error('Invalid XLSX/ZIP archive: EOCD not found');

  const cdEntries = dv.getUint16(eocdOff + 10, true);
  const cdOffset = dv.getUint32(eocdOff + 16, true);
  const dec = new TextDecoder('utf-8');
  const map = new Map();

  let ptr = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (ptr + 46 > bytes.length || dv.getUint32(ptr, true) !== 0x02014b50) break;
    const method = dv.getUint16(ptr + 10, true);
    const compSize = dv.getUint32(ptr + 20, true);
    const nameLen = dv.getUint16(ptr + 28, true);
    const extraLen = dv.getUint16(ptr + 30, true);
    const commentLen = dv.getUint16(ptr + 32, true);
    const localHeaderOff = dv.getUint32(ptr + 42, true);
    const name = dec.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    // Only decompress XML/rels files needed for spreadsheet reading
    if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue;

    const lNameLen = dv.getUint16(localHeaderOff + 26, true);
    const lExtraLen = dv.getUint16(localHeaderOff + 28, true);
    const dataStart = localHeaderOff + 30 + lNameLen + lExtraLen;
    const compSlice = bytes.subarray(dataStart, dataStart + compSize);

    if (method === 0) {
      map.set(name, compSlice);
    } else if (method === 8) {
      map.set(name, await inflateRaw(compSlice));
    }
  }
  return map;
}

function decodeXmlEntities(str) {
  return String(str ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&amp;/g, '&');
}

function colLettersToIndex(letters) {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function parseSharedStrings(xml) {
  const strings = [];
  if (!xml) return strings;
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    const inner = m[1];
    let text = '';
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRe.exec(inner)) !== null) {
      text += decodeXmlEntities(tm[1]);
    }
    strings.push(text);
  }
  return strings;
}

function parseWorkbookSheets(workbookXml, relsXml) {
  const relMap = new Map();
  if (relsXml) {
    const relRe = /<Relationship\b([^>]+)\/?>/g;
    let rm;
    while ((rm = relRe.exec(relsXml)) !== null) {
      const id = rm[1].match(/\bId="([^"]+)"/)?.[1];
      const target = rm[1].match(/\bTarget="([^"]+)"/)?.[1];
      if (id && target) {
        const clean = target.replace(/^\/+/, '');
        relMap.set(id, clean.startsWith('xl/') ? clean : `xl/${clean}`);
      }
    }
  }

  const sheets = [];
  if (workbookXml) {
    const shRe = /<sheet\b([^>]+)\/?>/g;
    let sm;
    while ((sm = shRe.exec(workbookXml)) !== null) {
      const name = decodeXmlEntities(sm[1].match(/\bname="([^"]+)"/)?.[1] || `Sheet${sheets.length + 1}`);
      const rId = sm[1].match(/\br:id="([^"]+)"/)?.[1];
      const target = (rId && relMap.get(rId)) || `xl/worksheets/sheet${sheets.length + 1}.xml`;
      sheets.push({ name, path: target });
    }
  }
  if (sheets.length === 0) {
    sheets.push({ name: 'Sheet1', path: 'xl/worksheets/sheet1.xml' });
  }
  return sheets;
}

function parseWorksheetXml(sheetXml, sharedStrings) {
  const matrix = [];
  let maxCols = 0;

  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(sheetXml)) !== null) {
    const rowBody = rm[1];
    const rowCells = [];
    let autoCol = 0;

    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(rowBody)) !== null) {
      const attrs = cm[1] || '';
      const body = cm[2] || '';
      const refMatch = attrs.match(/\br="([A-Z]+)\d+"/);
      const colIdx = refMatch ? colLettersToIndex(refMatch[1]) : autoCol;
      autoCol = colIdx + 1;

      const type = attrs.match(/\bt="([^"]+)"/)?.[1] || '';
      let val = '';

      if (type === 's') {
        const vStr = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
        const idx = vStr !== undefined ? Number(vStr) : -1;
        val = idx >= 0 && idx < sharedStrings.length ? sharedStrings[idx] : '';
      } else if (type === 'inlineStr') {
        const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let tm;
        while ((tm = tRe.exec(body)) !== null) val += decodeXmlEntities(tm[1]);
      } else if (type === 'b') {
        const vStr = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
        val = vStr === '1' ? 'TRUE' : 'FALSE';
      } else if (type === 'str' || type === 'e') {
        val = decodeXmlEntities(body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] || '');
      } else {
        const vStr = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
        const fStr = body.match(/<f\b[^>]*>([\s\S]*?)<\/f>/)?.[1];
        if (vStr !== undefined && vStr !== '') val = decodeXmlEntities(vStr);
        else if (fStr !== undefined) val = '=' + decodeXmlEntities(fStr);
        else val = '';
      }

      while (rowCells.length < colIdx) rowCells.push('');
      rowCells[colIdx] = val;
    }

    if (rowCells.length > maxCols) maxCols = rowCells.length;
    matrix.push(rowCells);
  }

  // Normalize row lengths cleanly so rectangular sheets match expected columns
  for (const r of matrix) {
    while (r.length < maxCols) r.push('');
  }
  return matrix;
}

/**
 * Read a native .xlsx workbook from raw bytes and return parsed sheet table + sheet list.
 *
 * @param {Uint8Array} bytes
 * @param {{ sheetName?: string, hasHeader?: boolean }} [options]
 * @returns {Promise<{
 *   sheetNames: string[],
 *   activeSheet: string,
 *   headers: string[],
 *   rows: Array<any>,
 *   totalRawLines: number
 * }>}
 */
export async function readXlsxWorkbook(bytes, options = {}) {
  const entries = await unzipEntries(bytes);
  const dec = new TextDecoder('utf-8');

  const getXml = (p) => (entries.has(p) ? dec.decode(entries.get(p)) : '');
  const workbookXml = getXml('xl/workbook.xml');
  const relsXml = getXml('xl/_rels/workbook.xml.rels');
  const sharedStringsXml = getXml('xl/sharedStrings.xml');

  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const sheets = parseWorkbookSheets(workbookXml, relsXml);
  const sheetNames = sheets.map((s) => s.name);

  let target = sheets[0];
  if (options.sheetName) {
    const found = sheets.find((s) => s.name.toLowerCase() === options.sheetName.toLowerCase());
    if (found) target = found;
  }

  const sheetXml = getXml(target.path);
  if (!sheetXml) {
    throw new Error(`Worksheet "${target.name}" (${target.path}) not found in XLSX archive`);
  }

  const matrix = parseWorksheetXml(sheetXml, sharedStrings);
  const hasHeader = options.hasHeader ?? true;

  let headers = [];
  let dataStart = 0;
  if (matrix.length > 0 && hasHeader) {
    headers = matrix[0].map((h, i) => (h || '').trim() || `column_${i + 1}`);
    dataStart = 1;
  } else if (matrix.length > 0) {
    headers = matrix[0].map((_, i) => `column_${i + 1}`);
  }

  const rows = matrix.slice(dataStart).map((cells, idx) => {
    const isBlank = cells.every((c) => (c || '').trim() === '');
    return {
      id: `row_${idx + 1}`,
      rowNumber: idx + 1,
      sourceLineStart: idx + (hasHeader ? 2 : 1),
      sourceLineEnd: idx + (hasHeader ? 2 : 1),
      raw: cells.join(','),
      cells,
      isBlank,
      hasQuoteIssue: false,
      isMultiline: false,
      hasTrailingDelimiter: false,
    };
  });

  return {
    sheetNames,
    activeSheet: target.name,
    headers,
    rows,
    totalRawLines: matrix.length,
  };
}
