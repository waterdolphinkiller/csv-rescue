/**
 * @fileoverview Encoding Detective — BOM detection, heuristic multi-encoding
 * scoring, sample preview decoding, and honest mojibake/U+FFFD reporting.
 */

import { SUPPORTED_ENCODINGS } from '../shared-types/index.mjs';

/**
 * Detect Byte Order Mark (BOM) from raw bytes.
 * @param {Uint8Array} bytes
 * @returns {{ bom: string | null, byteLength: number }}
 */
export function detectBom(bytes) {
  if (!bytes || bytes.length < 2) return { bom: null, byteLength: 0 };
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { bom: 'utf-8-bom', byteLength: 3 };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { bom: 'utf-16le', byteLength: 2 };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { bom: 'utf-16be', byteLength: 2 };
  }
  return { bom: null, byteLength: 0 };
}

/**
 * Validate whether a byte sequence is strictly valid UTF-8 and count multi-byte chars.
 * @param {Uint8Array} bytes
 * @returns {{ valid: boolean, multiByteCount: number, nonAsciiCount: number, nullByteCount: number }}
 */
export function inspectUtf8Bytes(bytes) {
  let valid = true;
  let multiByteCount = 0;
  let nonAsciiCount = 0;
  let nullByteCount = 0;

  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b === 0x00) {
      nullByteCount++;
      i++;
      continue;
    }
    if (b <= 0x7f) {
      i++;
      continue;
    }
    nonAsciiCount++;
    if ((b & 0xe0) === 0xc0 && i + 1 < bytes.length) {
      const b1 = bytes[i + 1];
      if ((b1 & 0xc0) === 0x80 && b >= 0xc2) {
        multiByteCount++;
        i += 2;
        continue;
      }
      valid = false;
      i++;
    } else if ((b & 0xf0) === 0xe0 && i + 2 < bytes.length) {
      const b1 = bytes[i + 1];
      const b2 = bytes[i + 2];
      if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80) {
        multiByteCount++;
        i += 3;
        continue;
      }
      valid = false;
      i++;
    } else if ((b & 0xf8) === 0xf0 && i + 3 < bytes.length) {
      const b1 = bytes[i + 1];
      const b2 = bytes[i + 2];
      const b3 = bytes[i + 3];
      if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80 && (b3 & 0xc0) === 0x80 && b <= 0xf4) {
        multiByteCount++;
        i += 4;
        continue;
      }
      valid = false;
      i++;
    } else {
      valid = false;
      i++;
    }
  }
  return { valid, multiByteCount, nonAsciiCount, nullByteCount };
}

/**
 * Decode bytes with a specific encoding ID safely without mutating original bytes.
 * @param {Uint8Array} bytes
 * @param {string} encodingId
 * @returns {{ text: string, replacementCount: number, controlCharCount: number, cjkCount: number, supported: boolean }}
 */
export function decodeBytes(bytes, encodingId) {
  const spec = SUPPORTED_ENCODINGS.find((e) => e.id === encodingId) || SUPPORTED_ENCODINGS[1];
  let slice = bytes;
  const bomInfo = detectBom(bytes);
  if (spec.stripBom && bomInfo.bom === encodingId && bomInfo.byteLength > 0) {
    slice = bytes.subarray(bomInfo.byteLength);
  } else if (encodingId === 'utf-8' && bomInfo.bom === 'utf-8-bom') {
    slice = bytes.subarray(3);
  }

  let text = '';
  let supported = true;
  try {
    const decoder = new TextDecoder(spec.decoder, { fatal: false });
    text = decoder.decode(slice);
  } catch {
    supported = false;
    text = new TextDecoder('utf-8', { fatal: false }).decode(slice);
  }

  let replacementCount = 0;
  let controlCharCount = 0;
  let cjkCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0xfffd) replacementCount++;
    else if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) controlCharCount++;
    else if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjkCount++;
    }
  }

  return { text, replacementCount, controlCharCount, cjkCount, supported };
}

/**
 * Analyze raw bytes and rank encoding candidates with transparent heuristic reasons.
 * Never claims 100% certainty for ambiguous legacy encodings; flags literal U+FFFD loss.
 *
 * @param {Uint8Array} bytes
 * @param {number} [sampleBytes=32768]
 * @returns {{
 *   bom: string | null,
 *   isPureAscii: boolean,
 *   hasPreexistingReplacementChars: boolean,
 *   allCandidatesIdentical: boolean,
 *   recommended: string,
 *   candidates: Array<{
 *     id: string,
 *     label: string,
 *     confidence: 'high' | 'medium' | 'low',
 *     score: number,
 *     reason: string,
 *     replacementCount: number,
 *     controlCharCount: number,
 *     cjkCount: number,
 *     sampleLines: string[],
 *     supported: boolean
 *   }>
 * }}
 */
export function detectEncodingCandidates(bytes, sampleBytes = 32768) {
  let sampleEnd = Math.min(bytes.length, sampleBytes);
  // Back up if sampleEnd splits a multi-byte UTF-8 sequence (continuation bytes 10xxxxxx)
  if (sampleEnd < bytes.length) {
    let back = 0;
    while (sampleEnd > 0 && back < 4 && (bytes[sampleEnd] & 0xc0) === 0x80) {
      sampleEnd--;
      back++;
    }
  }
  const sample = bytes.subarray(0, sampleEnd);
  const bomInfo = detectBom(sample);
  const utf8Check = inspectUtf8Bytes(sample);
  const isPureAscii = utf8Check.nonAsciiCount === 0 && utf8Check.nullByteCount === 0;

  // Check if literal UTF-8 replacement character EF BF BD is already baked into raw bytes
  let preexistingFFFD = false;
  for (let i = 0; i < sample.length - 2; i++) {
    if (sample[i] === 0xef && sample[i + 1] === 0xbf && sample[i + 2] === 0xbd) {
      preexistingFFFD = true;
      break;
    }
  }

  // Detect UTF-16 without BOM via alternating null bytes
  let evenNulls = 0;
  let oddNulls = 0;
  for (let i = 0; i < Math.min(sample.length, 2048); i++) {
    if (sample[i] === 0x00) {
      if (i % 2 === 0) evenNulls++;
      else oddNulls++;
    }
  }
  const looksUtf16Le = bomInfo.bom === 'utf-16le' || (oddNulls > 10 && oddNulls > evenNulls * 4);
  const looksUtf16Be = bomInfo.bom === 'utf-16be' || (evenNulls > 10 && evenNulls > oddNulls * 4);

  const candidates = [];

  for (const spec of SUPPORTED_ENCODINGS) {
    const decoded = decodeBytes(sample, spec.id);
    if (!decoded.supported) continue;

    let score = 50;
    const reasons = [];

    if (bomInfo.bom === spec.id) {
      score += 48;
      reasons.push('Matched explicit Byte Order Mark (BOM)');
    } else if (spec.id === 'utf-8-bom' && bomInfo.bom !== 'utf-8-bom') {
      score -= 25;
      reasons.push('No UTF-8 BOM prefix found');
    }

    if (spec.id === 'utf-8' || spec.id === 'utf-8-bom') {
      if (utf8Check.valid && !looksUtf16Le && !looksUtf16Be) {
        score += utf8Check.multiByteCount > 0 ? 35 : 25;
        reasons.push(
          utf8Check.multiByteCount > 0
            ? `Valid UTF-8 byte sequences (${utf8Check.multiByteCount} multi-byte chars)`
            : 'Pure ASCII compatible with UTF-8'
        );
      } else {
        score -= 40;
        reasons.push('Contains invalid UTF-8 byte sequences');
      }
    }

    if (spec.id === 'utf-16le') {
      if (looksUtf16Le) {
        score += 40;
        reasons.push('Alternating null-byte pattern consistent with UTF-16 LE');
      } else {
        score -= 45;
      }
    }

    if (spec.id === 'utf-16be') {
      if (looksUtf16Be) {
        score += 40;
        reasons.push('Alternating null-byte pattern consistent with UTF-16 BE');
      } else {
        score -= 45;
      }
    }

    if (spec.id === 'gb18030' || spec.id === 'big5' || spec.id === 'shift_jis') {
      if (!utf8Check.valid && !looksUtf16Le && !looksUtf16Be && decoded.replacementCount === 0 && decoded.cjkCount > 0) {
        score += 20 + Math.min(25, decoded.cjkCount);
        // Japanese Kana strongly distinguishes Shift_JIS from GB18030/Big5
        const kanaCount = (decoded.text.match(/[\u3040-\u30ff]/g) || []).length;
        if (spec.id === 'shift_jis' && kanaCount > 0) score += Math.min(12, kanaCount * 3);
        reasons.push(`Decodes ${decoded.cjkCount} readable CJK characters with zero replacement errors`);
      } else if (utf8Check.valid && utf8Check.multiByteCount > 0) {
        score -= 10;
        reasons.push('Bytes already form valid UTF-8');
      }
    }

    if (spec.id === 'windows-1252' || spec.id === 'iso-8859-1') {
      if (!utf8Check.valid && !looksUtf16Le && !looksUtf16Be) {
        score += spec.id === 'windows-1252' ? 18 : 14;
        reasons.push('Single-byte Western European encoding candidate');
      } else if (isPureAscii) {
        score += 5;
        reasons.push('ASCII subset identical to UTF-8');
      }
    }

    // Penalize replacement characters and unexpected control characters
    if (decoded.replacementCount > 0) {
      score -= Math.min(50, decoded.replacementCount * 8);
      reasons.push(`${decoded.replacementCount} replacement character(s) () detected`);
    }
    if (decoded.controlCharCount > 0) {
      score -= Math.min(35, decoded.controlCharCount * 5);
      reasons.push(`${decoded.controlCharCount} unexpected control character(s)`);
    }

    const clampedScore = Math.max(0, Math.min(99, score));
    const confidence =
      clampedScore >= 80 ? 'high' : clampedScore >= 50 ? 'medium' : 'low';

    const sampleLines = decoded.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .slice(0, 6);

    candidates.push({
      id: spec.id,
      label: spec.label,
      confidence,
      score: clampedScore,
      reason: reasons.join('; ') || 'Heuristic candidate',
      replacementCount: decoded.replacementCount,
      controlCharCount: decoded.controlCharCount,
      cjkCount: decoded.cjkCount,
      sampleLines,
      supported: decoded.supported,
    });
  }

  candidates.sort((a, b) => (b.score - a.score) || (b.cjkCount - a.cjkCount));

  const uniquePreviews = new Set(candidates.slice(0, 4).map((c) => c.sampleLines.join('\n')));
  const allCandidatesIdentical = isPureAscii && uniquePreviews.size === 1;

  return {
    bom: bomInfo.bom,
    isPureAscii,
    hasPreexistingReplacementChars: preexistingFFFD,
    allCandidatesIdentical,
    recommended: candidates[0]?.id || 'utf-8',
    candidates,
  };
}
