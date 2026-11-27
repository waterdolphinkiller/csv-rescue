/**
 * @fileoverview Quality Profile — Before/After Integrity Check, CSV Diff,
 * and Multi-file Batch Merge with schema conflict inspection.
 */

/**
 * Compute Before / After Integrity Check ledger.
 *
 * @param {{
 *   originalRowCount: number,
 *   currentRowCount: number,
 *   originalColCount: number,
 *   currentColCount: number,
 *   originalBytesLength: number,
 *   outputBytesLength: number,
 *   appliedRules: Array<{ ruleId: string, description: string, affectedCells: number, removedRows: number }>,
 *   unresolvedCount: number,
 *   autoFixedCount: number,
 *   userConfirmedCount: number,
 *   keptOriginalCount: number,
 *   encoding: string,
 *   delimiter: string,
 *   inputHash?: string,
 *   outputHash?: string
 * }} params
 */
export function buildIntegrityLedger(params) {
  const rowsRemovedTotal = Math.max(0, params.originalRowCount - params.currentRowCount);
  const removalReasons = params.appliedRules
    .filter((r) => r.removedRows > 0)
    .map((r) => ({ ruleId: r.ruleId, reason: r.description, count: r.removedRows }));
  const cellsModifiedTotal = params.appliedRules.reduce((acc, r) => acc + (r.affectedCells || 0), 0);

  return {
    originalRowCount: params.originalRowCount,
    outputRowCount: params.currentRowCount,
    rowsRemovedTotal,
    removalReasons,
    originalColCount: params.originalColCount,
    outputColCount: params.currentColCount,
    cellsModifiedTotal,
    unresolvedCount: params.unresolvedCount,
    autoFixedCount: params.autoFixedCount,
    userConfirmedCount: params.userConfirmedCount,
    keptOriginalCount: params.keptOriginalCount,
    originalBytesLength: params.originalBytesLength,
    outputBytesLength: params.outputBytesLength,
    bytesDelta: params.outputBytesLength - params.originalBytesLength,
    encoding: params.encoding,
    delimiter: params.delimiter,
    inputHash: params.inputHash || null,
    outputHash: params.outputHash || null,
  };
}

/**
 * Compare two CSV tables by primary key column (or row number if keyCol < 0).
 * @param {{ headers: string[], rows: Array<{ cells: string[] }> }} tableA
 * @param {{ headers: string[], rows: Array<{ cells: string[] }> }} tableB
 * @param {number} [keyCol=0]
 */
export function diffCsvTables(tableA, tableB, keyCol = 0) {
  const mapA = new Map();
  const mapB = new Map();

  tableA.rows.forEach((r, idx) => {
    const key = keyCol >= 0 ? (r.cells[keyCol] ?? '').trim() || `__row_${idx + 1}` : `row_${idx + 1}`;
    mapA.set(key, r.cells);
  });

  tableB.rows.forEach((r, idx) => {
    const key = keyCol >= 0 ? (r.cells[keyCol] ?? '').trim() || `__row_${idx + 1}` : `row_${idx + 1}`;
    mapB.set(key, r.cells);
  });

  const added = [];
  const removed = [];
  const modified = [];
  let unchangedCount = 0;

  const allHeaders = [...new Set([...tableA.headers, ...tableB.headers])];

  for (const [key, cellsA] of mapA.entries()) {
    if (!mapB.has(key)) {
      removed.push({ key, cells: cellsA });
    } else {
      const cellsB = mapB.get(key);
      const changes = [];
      for (const h of allHeaders) {
        const idxA = tableA.headers.indexOf(h);
        const idxB = tableB.headers.indexOf(h);
        const va = idxA >= 0 ? (cellsA[idxA] ?? '') : '';
        const vb = idxB >= 0 ? (cellsB[idxB] ?? '') : '';
        if (va !== vb) {
          changes.push({ column: h, before: va, after: vb });
        }
      }
      if (changes.length > 0) modified.push({ key, changes });
      else unchangedCount++;
    }
  }

  for (const [key, cellsB] of mapB.entries()) {
    if (!mapA.has(key)) {
      added.push({ key, cells: cellsB });
    }
  }

  return {
    keyColumn: keyCol >= 0 ? tableA.headers[keyCol] || `column_${keyCol + 1}` : 'Row Index',
    headerDiff: {
      onlyInA: tableA.headers.filter((h) => !tableB.headers.includes(h)),
      onlyInB: tableB.headers.filter((h) => !tableA.headers.includes(h)),
    },
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      unchangedCount,
    },
    added,
    removed,
    modified,
  };
}

/**
 * Inspect schema alignment across multiple CSV files before merging.
 * Never silently merges columns with different names.
 *
 * @param {Array<{ fileName: string, headers: string[], rows: Array<{ cells: string[] }> }>} files
 */
export function inspectBatchAlignment(files) {
  const unionHeaders = [];
  const headerPresence = new Map();

  for (const f of files) {
    const seenInFile = new Set();
    for (const h of f.headers) {
      if (seenInFile.has(h)) continue;
      seenInFile.add(h);
      if (!headerPresence.has(h)) {
        unionHeaders.push(h);
        headerPresence.set(h, []);
      }
      headerPresence.get(h).push(f.fileName);
    }
  }

  const schemaConflicts = unionHeaders
    .filter((h) => headerPresence.get(h).length < files.length)
    .map((h) => ({
      column: h,
      presentIn: headerPresence.get(h),
      missingIn: files.map((f) => f.fileName).filter((n) => !headerPresence.get(h).includes(n)),
    }));

  return {
    fileCount: files.length,
    totalRows: files.reduce((acc, f) => acc + f.rows.length, 0),
    unionHeaders,
    schemaConflicts,
    isSchemaIdentical: schemaConflicts.length === 0,
  };
}

/**
 * Merge multiple CSV files using explicit aligned headers, tagging source file
 * and optionally deduplicating across files by a key column.
 *
 * @param {Array<{ fileName: string, headers: string[], rows: Array<{ cells: string[] }> }>} files
 * @param {{ dedupeKey?: string, includeSourceColumn?: boolean }} [options]
 */
export function mergeBatchFiles(files, options = {}) {
  const { dedupeKey = '', includeSourceColumn = true } = options;
  const alignment = inspectBatchAlignment(files);
  const targetHeaders = includeSourceColumn
    ? ['_source_file', ...alignment.unionHeaders]
    : [...alignment.unionHeaders];

  const mergedRows = [];
  const seenKeys = new Set();
  let crossFileDuplicatesRemoved = 0;

  for (const f of files) {
    const colIndexMap = alignment.unionHeaders.map((uh) => f.headers.indexOf(uh));
    const keyIdxInUnion = dedupeKey ? alignment.unionHeaders.indexOf(dedupeKey) : -1;

    for (const r of f.rows) {
      const aligned = colIndexMap.map((idx) => (idx >= 0 ? r.cells[idx] ?? '' : ''));
      if (keyIdxInUnion >= 0) {
        const kv = (aligned[keyIdxInUnion] ?? '').trim().toLowerCase();
        if (kv) {
          if (seenKeys.has(kv)) {
            crossFileDuplicatesRemoved++;
            continue;
          }
          seenKeys.add(kv);
        }
      }
      mergedRows.push({
        id: `merged_${mergedRows.length + 1}`,
        rowNumber: mergedRows.length + 1,
        sourceLineStart: mergedRows.length + 1,
        sourceLineEnd: mergedRows.length + 1,
        raw: aligned.join(','),
        cells: includeSourceColumn ? [f.fileName, ...aligned] : aligned,
        isBlank: false,
        hasQuoteIssue: false,
        isMultiline: false,
        hasTrailingDelimiter: false,
      });
    }
  }

  return {
    headers: targetHeaders,
    rows: mergedRows,
    alignment,
    crossFileDuplicatesRemoved,
  };
}
