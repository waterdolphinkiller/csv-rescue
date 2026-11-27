(function () {
  const C = window.CsvRescueCore;

  // ============================================================================
  // Built-in Demo Samples (30-second instant value for new users)
  // ============================================================================
  const SAMPLES = {
    broken: {
      name: 'broken_orders_us.csv',
      desc: 'Unquoted address commas, bad quote, blank row, repeated header, ambiguous dates, US phones, leading-zero ZIP codes (02138/07030), formula cell',
      content:
        '\uFEFForder_id,customer_name,email,phone,address,zip_code,order_date,amount,notes\r\n' +
        'ORD-1001, Sarah Jenkins ,SARAH.J@Example.com,415-555-0198,742 Evergreen Ave, Boston MA,02138,04/03/2026,$1,250.50,VIP customer\r\n' +
        'ORD-1002,Marcus Reed,marcus@acme.us,212-555-0142,"350 Fifth Ave, New York NY",10118,2026-03-04,$320.00,Delivered\r\n' +
        ',,,,,,,,\r\n' +
        'order_id,customer_name,email,phone,address,zip_code,order_date,amount,notes\r\n' +
        'ORD-1003,Wei Chen (陈伟),wchen@pacific.io,+14085550177,"101 Hudson St, Hoboken NJ",07030,03/15/2026,$89.00,N/A\r\n' +
        'ORD-1002,Marcus Reed,marcus@acme.us,212-555-0142,"350 Fifth Ave, New York NY",10118,2026-03-04,$320.00,Delivered\r\n' +
        'ORD-1004,Elena Morales,elena-invalid-email,312-555-0164,"233 S Wacker Dr, Chicago IL",60606,03/04/2026,$450.00,=HYPERLINK("http://evil.example","Click")\r\n' +
        'ORD-1005,"Broken Quote User,devon@demo.us,617-555-0188,"1 Beacon St, Boston MA",02108,2026-03-18,$99.00,Check manually\r\n' +
        'ORD-1006,Hannah Park,hannah@westcoast.us,206-555-0123,"400 Broad St, Seattle WA",98109,03/19/2026,$610.00,Normal\r\n',
    },
    vendor: {
      name: 'supplier_a_products.csv',
      desc: 'Vendor catalog with alias headers (Item Desc, SKU Code, Unit Price, Qty Available), USD currency symbols & duplicates',
      content:
        'SKU Code,Item Desc,Unit Price,Qty Available,Category,Image URL,Product Status\r\n' +
        'SKU-001, Ceramic Pour-Over Dripper ,$34.00,45,Kitchenware,https://cdn.example.com/p1.jpg,Active\r\n' +
        'SKU-002,Bamboo Cutting Board (L),$24.50,120,Kitchenware,https://cdn.example.com/p2.jpg,Active\r\n' +
        'SKU-002,Bamboo Cutting Board (L),$24.50,120,Kitchenware,https://cdn.example.com/p2.jpg,Active\r\n' +
        'SKU-003,Stainless Travel Mug 16oz,$29.90,0,Drinkware,https://cdn.example.com/p3.jpg,Out of Stock\r\n' +
        'SKU-004,Organic Matcha Tin 100g,$42.00,18,Beverages,https://cdn.example.com/p4.jpg,Active\r\n' +
        ',,,,,,\r\n' +
        'SKU-005,Glass Storage Jar Set,$28.00,N/A,Kitchenware,https://cdn.example.com/p5.jpg,Active\r\n',
    },
    crm: {
      name: 'crm_contacts_us.csv',
      desc: 'US CRM leads with mixed-case emails, invalid email, US phone numbers, leading-zero ZIP codes (02138/07030) & formula risk',
      content:
        'Contact Name,Work Email,Phone Number,Company Name,ZIP Code,Country,Updated At\r\n' +
        'Daniel Brooks,Daniel.Brooks@Acme.US,415-555-0112,Acme Corp,02138,United States,2026-10-12\r\n' +
        'Daniel Brooks,daniel.brooks@acme.us,415-555-0112,Acme Corp,02138,United States,2026-11-20\r\n' +
        'Priya Patel,PRIYA@CLOUDOPS.IO,212-555-0199,CloudOps Inc,07030,United States,11/12/2026\r\n' +
        'Jordan Taylor,jordan-not-an-email,312-555-0133,Midwest Retail,60601,United States,11/05/2026\r\n' +
        'Jason Wu,jason@ventures.us,650-555-0174,@SUM(1+1)*cmd,94105,United States,2026-11-18\r\n',
    },
  };

  const BATCH_DEMO_FILES = [
    {
      name: 'warehouse_east_nov.csv',
      content:
        'sku,product_name,price,stock,warehouse\r\n' +
        'SKU-101,Desk Lamp Pro,$120.00,30,Newark-NJ\r\n' +
        'SKU-102,USB-C Hub 7-in-1,$85.00,50,Newark-NJ\r\n',
    },
    {
      name: 'warehouse_west_nov.csv',
      content:
        'sku,product_name,price,stock,currency\r\n' +
        'SKU-102,USB-C Hub 7-in-1,$85.00,40,USD\r\n' +
        'SKU-103,Ergonomic Mouse,$49.00,75,USD\r\n',
    },
  ];

  // ============================================================================
  // Bilingual i18n Dictionary (EN / 中文)
  // ============================================================================
  const I18N = {
    zh: {
      subtitle: '本地优先 CSV 急救工作台',
      localBadge: '100% 浏览器本地处理 · 零上传',
      tabs: {
        home: '首页',
        health: '① 健康报告',
        encoding: '编码侦探',
        review: '② 修复审核',
        grid: '③ 数据表格',
        mapping: '字段映射与供应商记忆',
        uncertainty: '不确定隔离区',
        batch: '批量合并与对比',
        export: '④ 安全导出',
      },
      heroTitle: '表格打不开、乱码或列错位？',
      heroLead: '先找出问题，再展示修复证据，不确定的数据绝不被偷偷改掉。所有文件默认留在你的设备本地。',
      dropTitle: '拖放 CSV / TSV / XLSX 文件到这里，或点击选择文件',
      dropSub: '支持单文件诊断修复，或一次拖入多个文件进行批量急救',
      chooseFiles: '选择本地文件',
      trySample: '一键体验真实问题样本：',
      sampleBroken: '损坏订单表 (乱码/错列/公式)',
      sampleVendor: '供应商商品表 (字段映射)',
      sampleCrm: 'CRM 联系人 (电话/邮箱/去重)',
      undo: '撤销',
      redo: '重做',
      resetOriginal: '还原原始数据',
      applySafeOnly: '仅应用安全修复',
      exportClean: '下载清洗后文件',
      receiptHtml: '下载修复收据 (HTML)',
      receiptJson: '下载修复收据 (JSON)',
    },
    en: {
      subtitle: 'Local-First CSV Repair Workspace',
      localBadge: '100% Local in Browser · Zero Upload',
      tabs: {
        home: 'Home',
        health: '1. Health Report',
        encoding: 'Encoding Detective',
        review: '2. Review Fixes',
        grid: '3. Data Grid',
        mapping: 'Mapping Studio',
        uncertainty: 'Uncertainty Queue',
        batch: 'Batch & Diff',
        export: '4. Safe Export',
      },
      heroTitle: 'Your spreadsheet looks broken?',
      heroLead: 'Find the problem. Review the fix with evidence. Keep uncertain data safe. Your files stay on this device by default.',
      dropTitle: 'Drop CSV / TSV / XLSX files here, or click to choose files',
      dropSub: 'Drop a single file to diagnose & repair, or multiple files for batch merge',
      chooseFiles: 'Choose files',
      trySample: 'Try a realistic sample:',
      sampleBroken: 'Broken Orders CSV',
      sampleVendor: 'Vendor Products CSV',
      sampleCrm: 'CRM Contacts CSV',
      undo: 'Undo',
      redo: 'Redo',
      resetOriginal: 'Reset Original',
      applySafeOnly: 'Apply Safe Fixes Only',
      exportClean: 'Download Cleaned File',
      receiptHtml: 'Download Receipt (HTML)',
      receiptJson: 'Download Receipt (JSON)',
    },
  };

  // ============================================================================
  // Application State
  // ============================================================================
  const STORAGE_KEY_TEMPLATES = 'csv_rescue_supplier_templates_v1';

  const state = {
    lang: 'en',
    activeTab: 'home',

    // Loaded File State
    fileName: '',
    rawBytes: null,
    inputHash: '',
    encodingReport: null,
    selectedEncoding: 'utf-8',
    previewEncoding: 'utf-8',
    dialectReport: null,
    selectedDelimiter: ',',
    hasHeader: true,

    // Table & History State (Original is read-only)
    originalTable: null,
    currentTable: null,
    undoStack: [],
    redoStack: [],
    appliedRules: [],
    skippedIssueIds: new Set(),

    // Diagnostics & Uncertainty Queue
    diagnostics: null,
    uncertaintyItems: [],
    autoFixedCount: 0,
    userConfirmedCount: 0,
    keptOriginalCount: 0,

    // UI Filters & Selections
    healthCategory: 'all',
    gridSearch: '',
    gridErrorsOnly: false,
    gridShowOriginal: false,
    gridPage: 0,
    gridPageSize: 50,
    selectedCell: null, // { rowId, rowNumber, colIdx }
    showColumnTools: false,

    // Human-friendly Fix Language
    nlPrompt: '',
    nlPlan: null,

    // Mapping Studio & Supplier Memory
    selectedPackId: 'ecommerce',
    mappings: [],
    keepUnmapped: true,
    templates: loadSavedTemplates(),
    activeTemplateName: '',
    schemaDrift: null,

    // Batch & Diff
    batchFiles: [],
    batchDedupeKey: '',
    batchIncludeSource: true,
    diffTargetTable: null,
    diffTargetName: '',
    diffKeyCol: 0,
    diffResult: null,

    // Safe Export
    exportFormat: 'csv-bom',
    customDelimiter: ';',
    formulaProtection: 'prefix_quote',
    lastExportMeta: null,

    // v2.0 Web Worker, Progress & Virtual Scrolling
    isProcessing: false,
    progressPhase: '',
    progressPct: 0,
    progressRows: 0,
    activeWorker: null,
    activeAbort: null,
    workerMode: 'idle', // 'worker' | 'stream-fallback' | 'idle'
    lastDiagMode: 'full',
    vScrollTop: 0,
    vRowHeight: 34,
    vViewportHeight: 500,
    cachedFilteredRows: null,
    sortCol: -1,
    sortDir: null, // 'asc' | 'desc' | null
    dragColIdx: null,
    editingCell: null, // { rowId, colIdx }
    cmdQuery: '',
    sheetNames: [],
    activeSheet: '',
    justLoaded: false,
    justHealed: false,
    prevHealthScore: null,
    heroShowcaseTab: 'zip',
  };

  function loadSavedTemplates() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function persistTemplates() {
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(state.templates));
    } catch {
      // Ignore storage quota / sandbox restrictions gracefully
    }
  }

  function t(key) {
    const dict = I18N[state.lang] || I18N.en;
    const parts = key.split('.');
    let cur = dict;
    for (const p of parts) cur = cur?.[p];
    return cur ?? key;
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }


  function computeHealthScore() {
    if (!state.diagnostics) return 100;
    const issues = state.diagnostics.issues || [];
    let penalty = 0;
    for (const iss of issues) {
      if (iss.severity === 'critical') penalty += 22;
      else if (iss.severity === 'high') penalty += 15;
      else if (iss.severity === 'warning') penalty += 8;
      else penalty += 3;
    }
    return Math.max(8, Math.min(100, 100 - penalty));
  }

  function launchMicroConfetti(originEl = null) {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      let canvas = document.getElementById('confetti-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        document.body.appendChild(canvas);
      }
      const w = (canvas.width = window.innerWidth || 1200);
      const h = (canvas.height = window.innerHeight || 800);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let ox = w * 0.5;
      let oy = h * 0.35;
      if (originEl && typeof originEl.getBoundingClientRect === 'function') {
        const rect = originEl.getBoundingClientRect();
        ox = rect.left + rect.width / 2;
        oy = rect.top + rect.height / 2;
      }

      const colors = ['#0f5132', '#9a6b2f', '#141619', '#1e4e68', '#525866'];
      const particles = Array.from({ length: 28 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.35;
        const speed = 3.2 + Math.random() * 4.5;
        return {
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.6,
          size: 4 + Math.random() * 4,
          color: colors[i % colors.length],
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.25,
          life: 1,
        };
      });

      let frame = 0;
      function tick() {
        frame++;
        ctx.clearRect(0, 0, w, h);
        let alive = 0;
        for (const pt of particles) {
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.vy += 0.16;
          pt.vx *= 0.98;
          pt.rot += pt.vrot;
          pt.life -= 0.022;
          if (pt.life <= 0) continue;
          alive++;
          ctx.save();
          ctx.globalAlpha = Math.max(0, pt.life);
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rot);
          ctx.fillStyle = pt.color;
          ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size * 0.65);
          ctx.restore();
        }
        if (alive > 0 && frame < 60) {
          requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, w, h);
          canvas.remove();
        }
      }
      requestAnimationFrame(tick);
    } catch {
      // Never block app behavior if canvas/animation unsupported
    }
  }

  function showToast(msg) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 3200);
  }

  function closeModal() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }

  function openModal(title, bodyHtml, footerHtml = '') {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-panel" role="dialog" aria-modal="true">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h3 style="margin:0;font-size:16px;">${esc(title)}</h3>
            <button class="btn btn-sm" data-action="close-modal">✕</button>
          </div>
          <div>${bodyHtml}</div>
          ${footerHtml ? `<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;">${footerHtml}</div>` : ''}
        </div>
      </div>
    `;
  }

  // ============================================================================
  // Core File Loading & Re-parsing Pipeline
  // ============================================================================
  function cancelActiveJob() {
    if (state.activeWorker) {
      state.activeWorker.terminate();
      state.activeWorker = null;
    }
    if (state.activeAbort) {
      state.activeAbort.abort();
      state.activeAbort = null;
    }
    state.isProcessing = false;
    state.progressPhase = '';
    state.progressPct = 0;
    render();
    showToast(state.lang === 'zh' ? '已取消后台解析任务' : 'Cancelled background job');
  }

  function runInBlobWorker(payload) {
    return new Promise((resolve, reject) => {
      if (typeof Worker === 'undefined' || !window.__CSV_RESCUE_WORKER_SRC__) {
        reject(new Error('WORKER_UNAVAILABLE'));
        return;
      }
      let worker;
      let blobUrl;
      try {
        const blob = new Blob([window.__CSV_RESCUE_WORKER_SRC__], { type: 'application/javascript' });
        blobUrl = URL.createObjectURL(blob);
        worker = new Worker(blobUrl);
      } catch (err) {
        reject(new Error('WORKER_UNAVAILABLE'));
        return;
      }
      state.activeWorker = worker;
      state.workerMode = 'worker';
      const jobId = Date.now();

      worker.onmessage = (e) => {
        const msg = e.data || {};
        if (msg.jobId !== jobId) return;
        if (msg.type === 'progress') {
          state.progressPhase = msg.phase;
          state.progressPct = msg.pct || 0;
          state.progressRows = msg.rowsParsed || 0;
          render();
        } else if (msg.type === 'done') {
          worker.terminate();
          URL.revokeObjectURL(blobUrl);
          state.activeWorker = null;
          resolve(msg.result);
        } else if (msg.type === 'error') {
          worker.terminate();
          URL.revokeObjectURL(blobUrl);
          state.activeWorker = null;
          reject(new Error(msg.message));
        }
      };

      worker.onerror = () => {
        worker.terminate();
        URL.revokeObjectURL(blobUrl);
        state.activeWorker = null;
        reject(new Error('WORKER_UNAVAILABLE'));
      };

      worker.postMessage({ jobId, type: 'parse_and_diagnose', payload });
    });
  }

  async function loadBytesIntoWorkspace(fileName, bytes, overrides = {}) {
    state.fileName = fileName;
    state.rawBytes = bytes;
    state.isProcessing = true;
    state.progressPhase = 'encoding';
    state.progressPct = 8;
    state.progressRows = 0;
    render();

    const useWorker = bytes.length > 200 * 1024 && !C.isXlsxBytes(bytes);
    try {
      let res = null;
      if (C.isXlsxBytes(bytes)) {
        const inputHash = await C.sha256Hex(bytes);
        const wb = await C.readXlsxWorkbook(bytes, { sheetName: overrides.sheetName });
        state.sheetNames = wb.sheetNames;
        state.activeSheet = wb.activeSheet;
        const encRep = { bom: null, recommended: 'utf-8', hasPreexistingReplacementChars: false, candidates: [{ id: 'utf-8', label: 'XLSX (OOXML UTF-8)', confidence: 'high', score: 99, reason: 'Native Excel .xlsx XML workbook', replacementCount: 0, sampleLines: [] }] };
        const dialRep = { delimiter: ',', delimiterLabel: `XLSX (${wb.activeSheet})`, expectedColumns: wb.headers.length };
        const diagnostics = C.runDiagnostics({ headers: wb.headers, rows: wb.rows, encodingReport: encRep, dialectReport: dialRep, fileSizeBytes: bytes.length });
        res = {
          inputHash,
          encodingReport: encRep,
          selectedEncoding: 'utf-8',
          dialectReport: dialRep,
          selectedDelimiter: ',',
          hasHeader: true,
          headers: wb.headers,
          rows: wb.rows,
          parseErrors: [],
          diagnostics,
        };
      } else {
        state.sheetNames = [];
        state.activeSheet = '';
      }
      if (useWorker) {
        try {
          res = await runInBlobWorker({
            bytes,
            encoding: overrides.encoding || null,
            delimiter: overrides.delimiter || null,
            hasHeader: overrides.hasHeader,
          });
        } catch (err) {
          if (err.message !== 'WORKER_UNAVAILABLE') throw err;
        }
      }

      if (!res) {
        state.workerMode = 'stream-fallback';
        const ctrl = new AbortController();
        state.activeAbort = ctrl;
        const inputHash = await C.sha256Hex(bytes);
        const encodingReport = C.detectEncodingCandidates(bytes);
        const selectedEncoding = overrides.encoding || encodingReport.recommended;
        const decoded = C.decodeBytes(bytes, selectedEncoding);
        const dialectReport = C.detectDialect(decoded.text);
        const selectedDelimiter = overrides.delimiter || dialectReport.delimiter;
        let hasHeader = overrides.hasHeader;
        if (hasHeader === undefined || hasHeader === null) {
          const previewParse = C.parseCsv(decoded.text, { delimiter: selectedDelimiter, hasHeader: false, maxRows: 12 });
          hasHeader = C.detectHeaderRow(
            previewParse.rows[0]?.cells || [],
            previewParse.rows.slice(1).map((r) => r.cells)
          ).hasHeader;
        }
        const parsed = await C.parseCsvStream(decoded.text, {
          delimiter: selectedDelimiter,
          hasHeader,
          signal: ctrl.signal,
          onProgress: (info) => {
            state.progressPhase = 'parsing';
            state.progressPct = Math.min(75, 20 + Math.round((info.bytesRead / Math.max(1, info.totalBytes)) * 55));
            state.progressRows = info.rowsParsed;
          },
        });
        const diagnostics = C.runDiagnostics({
          headers: parsed.headers,
          rows: parsed.rows,
          parseErrors: parsed.parseErrors,
          encodingReport,
          dialectReport,
          fileSizeBytes: bytes.length,
          signal: ctrl.signal,
        });
        state.activeAbort = null;
        res = {
          inputHash,
          encodingReport,
          selectedEncoding,
          dialectReport,
          selectedDelimiter,
          hasHeader,
          headers: parsed.headers,
          rows: parsed.rows,
          parseErrors: parsed.parseErrors,
          diagnostics,
        };
      }

      state.inputHash = res.inputHash;
      state.encodingReport = res.encodingReport;
      state.selectedEncoding = res.selectedEncoding;
      state.previewEncoding = res.selectedEncoding;
      state.dialectReport = res.dialectReport;
      state.selectedDelimiter = res.selectedDelimiter;
      state.hasHeader = res.hasHeader;

      // Keep lightweight original snapshot only for small/medium files; large files re-parse from rawBytes on Reset
      state.originalTable =
        res.rows.length <= 25000
          ? { headers: res.headers.slice(), rows: C.deepClone(res.rows) }
          : { headers: res.headers.slice(), rows: res.rows.slice(0, 500) };
      state.currentTable = { headers: res.headers, rows: res.rows };
      state.undoStack = [];
      state.redoStack = [];
      state.appliedRules = [];
      state.skippedIssueIds = new Set();
      state.autoFixedCount = 0;
      state.userConfirmedCount = 0;
      state.keptOriginalCount = 0;
      state.selectedCell = null;
      state.editingCell = null;
      state.sortCol = -1;
      state.sortDir = null;
      state.vScrollTop = 0;
      state.nlPlan = null;
      state.lastExportMeta = null;
      state.diagnostics = res.diagnostics;
      state.lastDiagMode = 'full';
      state.uncertaintyItems = res.diagnostics.uncertaintyItems.map((u) => ({ ...u, status: 'pending' }));
      refreshSuggestedMappings();

      state.isProcessing = false;
      state.justLoaded = true;
      state.prevHealthScore = computeHealthScore();
      state.activeTab = 'health';
      render();
      showToast(
        state.lang === 'zh'
          ? `已本地载入 ${fileName}（${res.diagnostics.summary.totalRows.toLocaleString()} 行，${res.diagnostics.summary.totalIssues} 项问题 · ${state.workerMode === 'worker' ? 'Web Worker' : '流式引擎'}）`
          : `Loaded ${fileName} (${res.diagnostics.summary.totalRows.toLocaleString()} rows, ${res.diagnostics.summary.totalIssues} issues)`
      );
    } catch (err) {
      state.isProcessing = false;
      state.activeAbort = null;
      render();
      if (err.name !== 'AbortError') {
        showToast(`Error: ${err.message}`);
      }
    }
  }

  function parseAndDiagnoseFromRaw() {
    const decoded = C.decodeBytes(state.rawBytes, state.selectedEncoding);
    const parsed = C.parseCsv(decoded.text, {
      delimiter: state.selectedDelimiter,
      hasHeader: state.hasHeader,
    });

    state.originalTable = {
      headers: [...parsed.headers],
      rows: C.deepClone(parsed.rows),
    };
    state.currentTable = {
      headers: [...parsed.headers],
      rows: C.deepClone(parsed.rows),
    };
    state.undoStack = [];
    state.redoStack = [];
    state.appliedRules = [];
    state.skippedIssueIds = new Set();
    state.autoFixedCount = 0;
    state.userConfirmedCount = 0;
    state.keptOriginalCount = 0;
    state.selectedCell = null;
    state.gridPage = 0;
    state.nlPlan = null;
    state.lastExportMeta = null;

    recomputeDiagnostics(parsed.parseErrors);
    refreshSuggestedMappings();
  }

  function recomputeDiagnostics(parseErrors = []) {
    if (!state.currentTable) return;
    state.diagnostics = C.runDiagnostics({
      headers: state.currentTable.headers,
      rows: state.currentTable.rows,
      parseErrors,
      encodingReport: state.encodingReport,
      dialectReport: state.dialectReport,
      fileSizeBytes: state.rawBytes ? state.rawBytes.length : 0,
    });
    // Preserve resolved status on uncertainty items if already handled
    const prevStatus = new Map(state.uncertaintyItems.map((u) => [u.id, u.status]));
    state.uncertaintyItems = state.diagnostics.uncertaintyItems.map((u) => ({
      ...u,
      status: prevStatus.get(u.id) || 'pending',
    }));
  }

  function refreshSuggestedMappings(templateObj = null) {
    if (!state.currentTable || !state.diagnostics) return;
    state.mappings = C.suggestColumnMappings(
      state.currentTable.headers,
      state.diagnostics.columnProfiles,
      state.selectedPackId,
      templateObj ? templateObj.mapping : null
    );
    if (templateObj) {
      state.schemaDrift = C.detectSchemaDrift(state.currentTable.headers, templateObj);
    } else {
      // Auto-check if any saved template matches >= 50% of headers
      let bestMatch = null;
      for (const tpl of state.templates) {
        const drift = C.detectSchemaDrift(state.currentTable.headers, tpl);
        if (drift.matchRatio >= 0.5) {
          bestMatch = { tpl, drift };
          break;
        }
      }
      if (bestMatch) {
        state.activeTemplateName = bestMatch.tpl.name;
        state.schemaDrift = bestMatch.drift;
        state.mappings = C.suggestColumnMappings(
          state.currentTable.headers,
          state.diagnostics.columnProfiles,
          bestMatch.tpl.packId || state.selectedPackId,
          bestMatch.tpl.mapping
        );
      } else {
        state.schemaDrift = null;
      }
    }
  }

  function pushHistoryAndApply(ruleObj, mode = 'confirmed') {
    const result = C.executeRule(state.currentTable, ruleObj, { mutateInPlace: true });
    state.undoStack.push({
      ruleObj,
      inversePatch: result.inversePatch,
      dirtyColumns: result.dirtyColumns,
      appliedRulesLen: state.appliedRules.length,
    });
    state.redoStack = [];
    state.currentTable = result.nextTable;
    state.appliedRules.push({
      ruleId: result.ruleId,
      description: result.description,
      affectedRows: result.affectedRows,
      affectedCells: result.affectedCells,
      removedRows: result.removedRows,
    });
    if (mode === 'auto') state.autoFixedCount += result.affectedRows;
    else state.userConfirmedCount += Math.max(1, result.affectedRows);

    // v2.0 Incremental column-scoped re-diagnosis when only specific columns changed
    if (result.dirtyColumns && result.dirtyColumns.length > 0 && state.diagnostics) {
      state.diagnostics = C.runDiagnosticsIncremental(state.diagnostics, {
        headers: state.currentTable.headers,
        rows: state.currentTable.rows,
        dirtyColumns: result.dirtyColumns,
      });
      state.lastDiagMode = 'incremental';
      const prevStatus = new Map(state.uncertaintyItems.map((u) => [u.id, u.status]));
      state.uncertaintyItems = state.diagnostics.uncertaintyItems.map((u) => ({
        ...u,
        status: prevStatus.get(u.id) || 'pending',
      }));
    } else {
      state.lastDiagMode = 'full';
      recomputeDiagnostics();
    }
    refreshSuggestedMappings();
    const nextScore = computeHealthScore();
    state.justHealed = true;
    const reachedPerfect = state.prevHealthScore !== null && state.prevHealthScore < 100 && nextScore === 100;
    state.prevHealthScore = nextScore;
    render();
    if (reachedPerfect) launchMicroConfetti();
    showToast(`${result.description} (${result.affectedRows.toLocaleString()} rows · ${state.lastDiagMode === 'incremental' ? 'Incremental' : 'Full'})`);
    return result;
  }

  function undoLast() {
    if (state.undoStack.length === 0) return;
    const entry = state.undoStack.pop();
    state.redoStack.push(entry.ruleObj);
    state.currentTable = C.applyInversePatch(state.currentTable, entry.inversePatch);
    state.appliedRules = state.appliedRules.slice(0, entry.appliedRulesLen);
    if (entry.dirtyColumns && entry.dirtyColumns.length > 0 && state.diagnostics) {
      state.diagnostics = C.runDiagnosticsIncremental(state.diagnostics, {
        headers: state.currentTable.headers,
        rows: state.currentTable.rows,
        dirtyColumns: entry.dirtyColumns,
      });
    } else {
      recomputeDiagnostics();
    }
    render();
    showToast(state.lang === 'zh' ? '已通过轻量 Patch 撤销上一步' : 'Undid via compact patch');
  }

  function redoLast() {
    if (state.redoStack.length === 0) return;
    const ruleObj = state.redoStack.pop();
    if (!ruleObj) return;
    pushHistoryAndApply(ruleObj, 'confirmed');
  }

  function triggerDownload(bytesOrText, mimeType, filename) {
    const blob = new Blob([bytesOrText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ============================================================================
  // View Renderers
  // ============================================================================
  function renderTopbar() {
    return `
      <header class="topbar">
        <div class="brand" data-action="nav" data-tab="home">
          <span class="brand-mark">CR</span>
          <span>CSV Rescue</span>
          <span class="brand-ver">v2.4</span>
        </div>
        <div class="topbar-actions">
          <button class="cmd-trigger" data-action="open-cmd-palette" title="Quick Feature Finder (Ctrl+K)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span>${state.lang === 'zh' ? '检索功能...' : 'Find feature...'}</span>
            <span class="kbd">⌘K</span>
          </button>
          <span class="privacy-pill"><span class="privacy-dot"></span> ${esc(t('localBadge'))}</span>
          <button class="btn btn-sm" data-action="toggle-lang">${state.lang === 'zh' ? 'English' : '中文'}</button>
        </div>
      </header>
    `;
  }

  function renderTabRail() {
    const hasFile = Boolean(state.currentTable);
    const issueCount = state.diagnostics?.summary?.totalIssues || 0;
    const pendingUq = state.uncertaintyItems.filter((u) => u.status === 'pending').length;

    const tabs = [
      { id: 'home', label: t('tabs.home'), enabled: true },
      { id: 'health', label: t('tabs.health'), enabled: hasFile, badge: issueCount > 0 ? { text: issueCount, cls: 'danger' } : null },
      { id: 'encoding', label: t('tabs.encoding'), enabled: hasFile },
      { id: 'review', label: t('tabs.review'), enabled: hasFile },
      { id: 'grid', label: t('tabs.grid'), enabled: hasFile },
      { id: 'mapping', label: t('tabs.mapping'), enabled: hasFile },
      { id: 'uncertainty', label: t('tabs.uncertainty'), enabled: hasFile, badge: pendingUq > 0 ? { text: pendingUq, cls: 'warn' } : null },
      { id: 'batch', label: t('tabs.batch'), enabled: true },
      { id: 'export', label: t('tabs.export'), enabled: hasFile },
    ];

    return `
      <nav class="tab-rail" role="tablist">
        ${tabs
          .map(
            (tab) => `
          <button
            class="tab-btn ${state.activeTab === tab.id ? 'active' : ''}"
            data-action="nav"
            data-tab="${tab.id}"
            ${tab.enabled ? '' : 'disabled'}
          >
            <span>${esc(tab.label)}</span>
            ${tab.badge ? `<span class="tab-badge ${tab.badge.cls}">${tab.badge.text}</span>` : ''}
          </button>
        `
          )
          .join('')}
      </nav>
    `;
  }

  function renderFileStrip() {
    if (!state.currentTable || state.activeTab === 'home' || state.activeTab === 'batch') return '';
    const s = state.diagnostics.summary;
    return `
      <div class="file-strip ${state.justLoaded ? 'scan-beam' : ''}">
        <div class="file-meta">
          <span class="file-name">${esc(state.fileName)}</span>
          <span class="meta-chip">${C.formatBytes(s.fileSizeBytes)}</span>
          <span class="meta-chip">${s.totalRows} rows × ${s.totalColumns} cols</span>
          <span class="meta-chip">${esc(state.selectedEncoding.toUpperCase())}</span>
          <span class="meta-chip">Delim: ${esc(state.selectedDelimiter === '\t' ? 'TAB' : state.selectedDelimiter)}</span>
          ${state.sheetNames.length > 1 ? `<select class="select" id="xlsx-sheet-select" style="width:auto;padding:3px 8px;font-size:12px;">${state.sheetNames.map((sn) => `<option value="${esc(sn)}" ${sn === state.activeSheet ? 'selected' : ''}>Sheet: ${esc(sn)}</option>`).join('')}</select>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm" data-action="undo" ${state.undoStack.length === 0 ? 'disabled' : ''}>↶ ${esc(t('undo'))} (${state.undoStack.length})</button>
          <button class="btn btn-sm" data-action="redo" ${state.redoStack.length === 0 ? 'disabled' : ''}>↷ ${esc(t('redo'))}</button>
          <button class="btn btn-sm" data-action="reset-original" ${state.undoStack.length === 0 ? 'disabled' : ''}>${esc(t('resetOriginal'))}</button>
          <button class="btn btn-sm btn-primary" data-action="nav" data-tab="export">${esc(t('tabs.export'))} →</button>
        </div>
      </div>
    `;
  }

  const HERO_SHOWCASE = {
    zip: {
      tab: 'US ZIP 02138',
      kicker: '01 · Postal & Shipping Integrity',
      heading: 'Restore stripped US leading zeros automatically',
      headingZh: '自动修复被 Excel 吞掉的美国邮编前导零',
      desc: 'Stops Excel from turning Boston (02138), Hoboken (07030), and ZIP+4 postal codes into broken 4-digit integers—with SpreadsheetML text export.',
      descZh: '防止 Excel 打开 CSV 时把波士顿 (02138) 与新泽西 (07030) 邮编强转成 4 位数字，支持原生文本格式导出。',
      before: 'zip_code: 2138  |  7030  |  2108-1234',
      after: 'zip_code: "02138"  |  "07030"  |  "02108-1234"',
      sample: 'broken',
    },
    mojibake: {
      tab: 'UTF-8 Mojibake',
      kicker: '02 · Read-Only Encoding Detective',
      heading: 'Decode garbled accents & CJK without guessing',
      headingZh: '只读字节嗅探，精准修复乱码不盲猜',
      desc: 'Inspects raw bytes across 9 encodings (UTF-8 BOM, Windows-1252, GB18030, Shift_JIS), previews cleanly, and flags irrecoverable U+FFFD loss honestly.',
      descZh: '对比 9 种主流编码候选并实时预览解码行，诚实区分可恢复乱码与已丢失字节 (U+FFFD)。',
      before: 'JosÃ© GarcÃ­a  ·  Oâ€™Connor  ·  CrÃ¨me',
      after: 'José García  ·  O’Connor  ·  Crème (UTF-8 BOM)',
      sample: 'broken',
    },
    xlsx: {
      tab: 'Multi-Sheet .xlsx',
      kicker: '03 · Zero-Dependency Native Excel Reader',
      heading: 'Switch vendor .xlsx sheets right in the browser',
      headingZh: '零依赖浏览器原生解析多表 Excel (.xlsx)',
      desc: 'Parses multi-tab OOXML workbooks using native DecompressionStream, preserves sparse cell coordinates, and exports clean UTF-8 CSV or JSON.',
      descZh: '直接拖入多工作表 .xlsx 文件即可切换标签页、完成诊断并导出干净标准 CSV 或 JSON。',
      before: 'vendor_q4.xlsx (4 tabs · blank rows · $1,250.50)',
      after: 'Sheet: US_Orders → clean UTF-8 BOM CSV (-1250.50)',
      sample: 'vendor',
    },
    owasp: {
      tab: 'OWASP Guard',
      kicker: '04 · Formula Injection & Uncertainty Queue',
      heading: 'Quarantine broken rows & neutralize formulas',
      headingZh: '隔离区兜底坏行，拦截表格公式注入',
      desc: 'Never silently guesses on unclosed quotes or unquoted address commas; flags =HYPERLINK / @SUM cells while preserving harmless negative numbers and +1 phones.',
      descZh: '绝不静默篡改错列坏行，精准识别危险公式注入，同时放行合法负数与 +1 国际电话。',
      before: '=HYPERLINK("http://evil.example","Click")',
      after: "\'=HYPERLINK(\"http://evil.example\",\"Click\")  [Guarded]",
      sample: 'crm',
    },
    stream: {
      tab: '500k Stream & MCP',
      kicker: '05 · Constant-Memory Engine & AI Agent Sandbox',
      heading: '500,000 rows in ~1.0s + sandboxed MCP server',
      headingZh: '50 万行秒级流式诊断 + 安全沙盒 MCP 服务',
      desc: '100k rows stay fluid in-browser via Web Worker & 34px Virtual Scroll; CLI/MCP streams 45 MB files under 20 MB RAM with --allow-dir symlink protection.',
      descZh: '浏览器端 Web Worker + 虚拟滚动流畅处理 10 万行；CLI/MCP 流式引擎在 20 MB 内存内秒级处理 50 万行。',
      before: '45.46 MB CSV (500,000 rows) → Browser crash',
      after: '1,020 ms · 19.3 MB heap · SHA-256 Receipt',
      sample: 'broken',
    },
  };

  function renderHome() {
    const zh = state.lang === 'zh';
    const activeKey = HERO_SHOWCASE[state.heroShowcaseTab] ? state.heroShowcaseTab : 'zip';
    const sc = HERO_SHOWCASE[activeKey];

    return `
      <section class="hero-stage" id="hero-stage" aria-label="CSV Rescue 3D Code Waterfall Restoration Theater">
        <canvas id="restoration-canvas" aria-hidden="true"></canvas>
        <div class="hero-stage-vignette" aria-hidden="true"></div>

        <div class="hero-stage-inner">
          <div class="hero-stage-top">
            <div class="hero-eyebrow">
              <span class="privacy-dot"></span>
              <span>${zh ? '100% 本地主权数据修复剧场 · 零云端上传 · 移动鼠标操控 3D 光影棱镜' : 'SOVEREIGN LOCAL-FIRST DATA ATELIER · ZERO CLOUD UPLOADS · MOVE CURSOR TO GUIDE 3D PRISM'}</span>
            </div>
            <h1 class="hero-stage-title">${
              zh
                ? '全球商业的命脉仍跑在纯文本表格上。无需离开桌面，<em>重建数据秩序。</em>'
                : 'The world’s commerce still runs on plain text. Restore order to it—<em>without ever leaving your desk.</em>'
            }</h1>
            <p class="hero-stage-lead">${
              zh
                ? '在浏览器或本地终端瞬间修复乱码、错列、美国邮编前导零与多表 .xlsx 文件。每处修改均附带前后对照证据，不确定坏行进入隔离区，绝不被静默篡改。'
                : 'Repair broken CSV, TSV, and multi-sheet Excel (.xlsx) files entirely inside your browser or local CLI/MCP server. Every edit carries Before/After evidence, uncertain rows stay quarantined, and every export ships with a privacy-safe SHA-256 receipt.'
            }</p>
          </div>

          <div class="hero-stage-grid">
            <div id="dropzone" class="dropzone">
              <div class="dropzone-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
              </div>
              <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;margin-bottom:5px;color:#faf8f4;">${esc(t('dropTitle'))}</div>
              <div style="font-size:12.8px;color:rgba(245,242,235,0.68);margin-bottom:18px;">${esc(t('dropSub'))}</div>
              <input type="file" id="file-input" accept=".csv,.tsv,.txt,.xlsx" multiple style="display:none;" />
              <button class="btn btn-ivory" data-action="trigger-file-input">${esc(t('chooseFiles'))}</button>
            </div>

            <aside class="hero-ledger" aria-label="Interactive Core Capabilities Preview">
              <div class="ledger-head">
                <span class="ledger-head-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  ${zh ? '核心能力实时演示台' : 'LIVE CAPABILITY LEDGER'}
                </span>
                <span class="ledger-head-badge">0 BYTES UPLOADED</span>
              </div>

              <div class="ledger-tabs" role="tablist">
                ${Object.entries(HERO_SHOWCASE).map(([k, item]) => `
                  <button class="ledger-tab ${k === activeKey ? 'active' : ''}" data-action="select-hero-tab" data-hero-tab="${k}" role="tab" aria-selected="${k === activeKey}">${esc(item.tab)}</button>
                `).join('')}
              </div>

              <div class="ledger-body">
                <div class="ledger-kicker">${esc(sc.kicker)}</div>
                <h2 class="ledger-heading">${esc(zh ? sc.headingZh : sc.heading)}</h2>
                <p class="ledger-desc">${esc(zh ? sc.descZh : sc.desc)}</p>

                <div class="ledger-diff">
                  <div class="ledger-cell before">
                    <div class="ledger-cell-lbl">Before · Raw Chaos</div>
                    <div class="ledger-cell-val">${esc(sc.before)}</div>
                  </div>
                  <div class="ledger-cell after">
                    <div class="ledger-cell-lbl">After · Restored</div>
                    <div class="ledger-cell-val">${esc(sc.after)}</div>
                  </div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                  <span style="font-size:11.8px;color:rgba(245,242,235,0.62);">${zh ? 'Web Worker · Node CLI · Stdio MCP' : 'Browser Worker · Node CLI · Stdio MCP'}</span>
                  <button class="btn btn-sm btn-ivory" data-action="load-sample" data-sample="${esc(sc.sample)}">${zh ? '载入此场景实测 →' : 'Try This Scenario →'}</button>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div class="hero-monument-bar">
          <div class="monument-stat">
            <div class="monument-val">500,000</div>
            <div class="monument-lbl">${zh ? '行 O(1) 流式实测吞吐' : 'Rows streamed at O(1) RAM'}</div>
          </div>
          <div class="monument-stat">
            <div class="monument-val brass">~1.1 s</div>
            <div class="monument-lbl">${zh ? '45.46 MB 文件完整诊断耗时' : 'Full diagnosis on 45.46 MB'}</div>
          </div>
          <div class="monument-stat">
            <div class="monument-val emerald">&lt; 20 MB</div>
            <div class="monument-lbl">${zh ? '流式处理峰值堆内存占用' : 'Peak heap memory footprint'}</div>
          </div>
          <div class="monument-stat">
            <div class="monument-val emerald">0 Bytes</div>
            <div class="monument-lbl">${zh ? '上传至任何云端服务器' : 'Uploaded to any cloud server'}</div>
          </div>
        </div>
      </section>

      <div class="hero-samples-band">
        <span style="font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);">${zh ? '一键载入美区真实样本：' : 'Instant US datasets:'}</span>
        <div class="sample-bar">
          <button class="sample-pill accent" data-action="load-sample" data-sample="broken"><span class="dot"></span>${esc(t('sampleBroken'))}</button>
          <button class="sample-pill" data-action="load-sample" data-sample="vendor"><span class="dot"></span>${esc(t('sampleVendor'))}</button>
          <button class="sample-pill" data-action="load-sample" data-sample="crm"><span class="dot"></span>${esc(t('sampleCrm'))}</button>
          <button class="sample-pill accent" data-action="load-stress-100k"><span class="dot"></span>${zh ? '100,000 行压测样本' : '100k-Row Stress Test'}</button>
          <button class="sample-pill" data-action="nav" data-tab="batch"><span class="dot"></span>${esc(t('tabs.batch'))}</button>
        </div>
      </div>

      <div class="pillars">
        <div class="pillar">
          <div class="pillar-num">01 / DIAGNOSE</div>
          <h3>${zh ? '先定位根因，再动手修复' : 'Find the exact fault first'}</h3>
          <p>${zh ? '导入瞬间完成编码嗅探、方言识别、错列定位、日期歧义与公式注入审计，健康环实时打分。' : 'Instant Health Report for encoding mojibake, broken quotes, unquoted commas, date ambiguity, duplicates, and formula injection.'}</p>
        </div>
        <div class="pillar">
          <div class="pillar-num">02 / EVIDENCE</div>
          <h3>${zh ? '每一处修改都有前后对照' : 'Review every fix with evidence'}</h3>
          <p>${zh ? '每条规则展示受影响行数、风险等级与真实样本对照；支持自然语言指令生成可审查计划与 Ctrl+Z 瞬间撤销。' : 'Every rule previews affected rows, risk level, and real Before/After samples—with compact-patch Ctrl+Z Undo.'}</p>
        </div>
        <div class="pillar">
          <div class="pillar-num">03 / CUSTODY</div>
          <h3>${zh ? '不猜疑、不上传、可审计' : 'Keep uncertain data safe'}</h3>
          <p>${zh ? '原始字节全程只读，歧义行进入隔离区或导出离线人工复核页；输出附带不含敏感内容的 SHA-256 修复收据。' : 'Original bytes stay read-only, broken rows enter the Uncertainty Queue, and exports include privacy-safe SHA-256 receipts.'}</p>
        </div>
      </div>
    `;
  }

  function renderHealthReport() {
    const d = state.diagnostics;
    const s = d.summary;
    const score = computeHealthScore();
    const radius = 32;
    const circ = 2 * Math.PI * radius;
    const offset = circ * (1 - score / 100);
    const ringColor = score >= 90 ? '#0f5132' : score >= 65 ? '#9a6b2f' : '#9b1c1c';
    const scoreHeadline =
      score === 100
        ? (state.lang === 'zh' ? '文件状态极佳 — 已可安全导出！' : 'File looks clean — ready for Safe Export!')
        : score >= 75
        ? (state.lang === 'zh' ? '整体良好，处理以下几项即可放心交付' : 'Mostly healthy — a few quick fixes away from clean')
        : (state.lang === 'zh' ? '发现结构或格式风险，建议逐项核对修复' : 'Structural or format risks found — review fixes before exporting');
    const cats = [
      { id: 'all', label: state.lang === 'zh' ? '全部' : 'All' },
      { id: 'structure', label: state.lang === 'zh' ? '结构与坏行' : 'Structure' },
      { id: 'encoding', label: state.lang === 'zh' ? '编码' : 'Encoding' },
      { id: 'columns', label: state.lang === 'zh' ? '字段格式' : 'Columns' },
      { id: 'duplicates', label: state.lang === 'zh' ? '重复数据' : 'Duplicates' },
      { id: 'security', label: state.lang === 'zh' ? '导出安全' : 'Security' },
    ];

    const filteredIssues =
      state.healthCategory === 'all'
        ? d.issues
        : d.issues.filter((i) => i.category === state.healthCategory);

    return `
      <div class="health-hero-strip ${state.justHealed ? 'heal-flash' : ''}">
        <div class="health-ring-wrap" aria-label="CSV Health Score">
          <svg class="health-ring-svg" viewBox="0 0 78 78">
            <circle class="health-ring-track" cx="39" cy="39" r="${radius}"></circle>
            <circle class="health-ring-progress" cx="39" cy="39" r="${radius}" stroke="${ringColor}" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
          </svg>
          <div class="health-ring-score">
            <span>${score}</span>
            <small>Score</small>
          </div>
        </div>
        <div style="flex:1;min-width:220px;">
          <div style="font-size:15.5px;font-weight:700;color:#0f172a;">${esc(scoreHeadline)}</div>
          <div style="font-size:12.5px;color:#64748b;margin-top:3px;">${
            state.lang === 'zh'
              ? `共 ${s.totalRows.toLocaleString()} 行 × ${s.totalColumns} 列 · 每修复一项，健康评分实时更新并可随时 Ctrl+Z 撤销。`
              : `${s.totalRows.toLocaleString()} rows × ${s.totalColumns} cols · Score updates live as you repair, with instant Ctrl+Z undo.`
          }</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-safe btn-sm" data-action="apply-safe-fixes">${esc(t('applySafeOnly'))}</button>
          <button class="btn btn-primary btn-sm" data-action="nav" data-tab="review">${state.lang === 'zh' ? '进入修复审核 →' : 'Review Fixes →'}</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">${state.lang === 'zh' ? '发现问题项' : 'Issues Found'}</div>
          <div class="kpi-value ${s.totalIssues > 0 ? 'critical' : 'safe'}">${s.totalIssues}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${state.lang === 'zh' ? '受影响行数' : 'Affected Rows'}</div>
          <div class="kpi-value ${s.affectedRowCount > 0 ? 'warning' : 'safe'}">${s.affectedRowCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${state.lang === 'zh' ? '需人工确认 (隔离区)' : 'Needs Review (Queue)'}</div>
          <div class="kpi-value brand">${state.uncertaintyItems.filter((u) => u.status === 'pending').length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${state.lang === 'zh' ? '公式注入风险单元格' : 'Formula-Sensitive Cells'}</div>
          <div class="kpi-value ${s.formulaHitCount > 0 ? 'critical' : 'safe'}">${s.formulaHitCount}</div>
        </div>
      </div>

      ${
        s.sensitiveColumns.length > 0
          ? `<div class="notice info"><strong>${state.lang === 'zh' ? '隐私提示：' : 'Privacy Notice:'}</strong> ${
              state.lang === 'zh' ? '检测到可能包含敏感信息的列：' : 'Possible sensitive columns detected: '
            }<strong>${s.sensitiveColumns.map((c) => `${c.name} (${c.type})`).join(', ')}</strong>. ${
              state.lang === 'zh' ? '所有处理均在本地完成，修复收据默认不包含原始单元格内容。' : 'All processing stays local; Repair Receipts omit raw cell values by default.'
            }</div>`
          : ''
      }

      <div class="filter-bar">
        ${cats
          .map(
            (c) => `
          <button class="pill-btn ${state.healthCategory === c.id ? 'active' : ''}" data-action="set-health-cat" data-cat="${c.id}">
            ${esc(c.label)}
          </button>
        `
          )
          .join('')}
        <div style="margin-left:auto;display:flex;gap:8px;">
          <button class="btn btn-safe btn-sm" data-action="apply-safe-fixes">${esc(t('applySafeOnly'))}</button>
          <button class="btn btn-primary btn-sm" data-action="nav" data-tab="review">${state.lang === 'zh' ? '进入修复审核 →' : 'Review all fixes →'}</button>
        </div>
      </div>

      ${
        filteredIssues.length === 0
          ? `<div class="notice safe">${state.lang === 'zh' ? '该分类下未发现问题，数据结构健康。' : 'No issues detected in this category.'}</div>`
          : filteredIssues
              .map(
                (iss) => `
          <div class="issue-card ${iss.severity}">
            <div class="issue-head">
              <div class="issue-title-group">
                <span class="sev-badge sev-${iss.severity}">${esc(iss.severity)}</span>
                <span class="issue-title">${esc(iss.title)}</span>
              </div>
              <span class="meta-chip">${iss.affectedCount} ${state.lang === 'zh' ? '处受影响' : 'affected'}</span>
            </div>
            <p class="issue-desc">${esc(iss.explanation)}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-sm btn-primary" data-action="nav" data-tab="review">${state.lang === 'zh' ? '查看修复证据' : 'Review Fix Evidence'}</button>
              <button class="btn btn-sm" data-action="jump-errors-grid">${state.lang === 'zh' ? '在表格中定位错误行' : 'Inspect in Data Grid'}</button>
              ${
                iss.code === 'FORMULA_INJECTION_RISK'
                  ? `<button class="btn btn-sm" data-action="nav" data-tab="export">${state.lang === 'zh' ? '配置导出公式防护' : 'Configure Export Safety'}</button>`
                  : ''
              }
            </div>
          </div>
        `
              )
              .join('')
      }
    `;
  }

  function renderEncodingDetective() {
    const rep = state.encodingReport;
    const previewCand =
      rep.candidates.find((c) => c.id === state.previewEncoding) || rep.candidates[0];

    return `
      <div class="card">
        <h2 class="card-title">${state.lang === 'zh' ? '编码侦探与方言设置' : 'Encoding Detective & Dialect Controls'}</h2>
        <p class="card-sub">${
          state.lang === 'zh'
            ? '编码检测基于字节启发式分析，不保证 100% 准确。原始字节始终只读，确认后才会重新解码。'
            : 'Heuristic byte inspection — not a guarantee. Original bytes remain untouched until you confirm.'
        }</p>

        ${
          rep.hasPreexistingReplacementChars
            ? `<div class="notice danger"><strong>${state.lang === 'zh' ? '不可逆损坏提示：' : 'Irreversible Damage Warning:'}</strong> ${
                state.lang === 'zh'
                  ? '原始字节中已包含 UTF-8 替换字符 (EF BF BD / )，切换编码无法找回已丢失的字符。'
                  : 'Raw file bytes already contain literal UTF-8 replacement characters (). Re-decoding cannot restore already-lost characters.'
              }</div>`
            : ''
        }

        <div class="form-row">
          <div class="form-field">
            <label>${state.lang === 'zh' ? '分隔符 (Delimiter)' : 'Delimiter'}</label>
            <select class="select" id="dialect-delim-select">
              ${C.DELIMITER_OPTIONS.map(
                (opt) =>
                  `<option value="${esc(opt.char)}" ${state.selectedDelimiter === opt.char ? 'selected' : ''}>${esc(opt.label)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-field">
            <label>${state.lang === 'zh' ? '首行是否为表头' : 'First Row is Header'}</label>
            <select class="select" id="dialect-header-select">
              <option value="true" ${state.hasHeader ? 'selected' : ''}>Yes (Header Row)</option>
              <option value="false" ${!state.hasHeader ? 'selected' : ''}>No (Generate column_1...)</option>
            </select>
          </div>
          <div>
            <button class="btn btn-primary" data-action="apply-dialect">${state.lang === 'zh' ? '应用编码与分隔符重新解析' : 'Re-parse with Selection'}</button>
          </div>
        </div>

        <div class="table-wrap" style="max-height:300px;margin-bottom:14px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>${state.lang === 'zh' ? '候选编码' : 'Candidate Encoding'}</th>
                <th>${state.lang === 'zh' ? '置信度' : 'Confidence'}</th>
                <th>${state.lang === 'zh' ? '判定依据' : 'Heuristic Reason'}</th>
                <th>U+FFFD</th>
                <th>${state.lang === 'zh' ? '操作' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              ${rep.candidates
                .map(
                  (c) => `
                <tr>
                  <td><strong>${esc(c.label)}</strong> ${c.id === state.selectedEncoding ? '<span class="sev-badge sev-safe">Active</span>' : ''}</td>
                  <td><span class="sev-badge sev-${c.confidence === 'high' ? 'safe' : c.confidence === 'medium' ? 'warning' : 'info'}">${esc(c.confidence)}</span></td>
                  <td style="max-width:340px;white-space:normal;">${esc(c.reason)}</td>
                  <td>${c.replacementCount}</td>
                  <td>
                    <button class="btn btn-sm" data-action="preview-encoding" data-enc="${esc(c.id)}">${state.lang === 'zh' ? '预览' : 'Preview'}</button>
                    <button class="btn btn-sm btn-primary" data-action="select-encoding" data-enc="${esc(c.id)}">${state.lang === 'zh' ? '使用此编码' : 'Use'}</button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div style="font-size:12.5px;font-weight:600;margin-bottom:6px;">
          ${state.lang === 'zh' ? '解码样本预览' : 'Decoded Sample Preview'} — <code>${esc(previewCand?.label || '')}</code>
        </div>
        <pre class="preview-pre">${esc((previewCand?.sampleLines || []).join('\n'))}</pre>
      </div>
    `;
  }

  function renderReviewFixes() {
    const issues = state.diagnostics.issues.filter((i) => !state.skippedIssueIds.has(i.id));

    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
          <div>
            <h2 class="card-title" style="margin:0;">${state.lang === 'zh' ? '人话清洗指令（本地规则计划生成）' : 'Human-Friendly Fix Language (Local Plan Parser)'}</h2>
            <p class="card-sub" style="margin:2px 0 0;">${
              state.lang === 'zh'
                ? '用自然语言描述需求，系统只生成可审查的清洗计划与执行前检查，绝不静默修改数据。'
                : 'Describe your cleaning steps in plain language. CSV Rescue generates a reviewable plan with preflight checks before changing anything.'
            }</p>
          </div>
          <button class="btn btn-sm" data-action="fill-nl-sample">${state.lang === 'zh' ? '填入示例指令' : 'Insert Sample Prompt'}</button>
        </div>

        <div class="form-row">
          <div class="form-field">
            <textarea id="nl-input" class="textarea" rows="2" placeholder="${
              state.lang === 'zh'
                ? '例如：删除空白行，把邮箱统一成小写，保留最新订单，电话号码统一加国家代码，最后导出 Excel 可以打开的 CSV'
                : 'e.g. Remove blank rows, lowercase email, keep latest order, normalize Malaysia phone numbers, export Excel CSV with BOM'
            }">${esc(state.nlPrompt)}</textarea>
          </div>
          <div>
            <button class="btn btn-primary" data-action="parse-nl">${state.lang === 'zh' ? '生成清洗计划' : 'Generate Plan'}</button>
          </div>
        </div>

        ${
          state.nlPlan
            ? `
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;margin-top:8px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:6px;">${state.lang === 'zh' ? '待确认清洗计划：' : 'Reviewable Cleaning Plan:'}</div>
            ${
              state.nlPlan.steps.length === 0
                ? `<div style="color:#64748b;font-size:12.5px;">${state.lang === 'zh' ? '未匹配到可执行规则，请尝试包含关键词（如：空白行、去空格、邮箱小写、去重、电话、日期、金额）。' : 'No matching rules detected. Try keywords like blank rows, trim, lowercase email, deduplicate, phone, date, currency.'}</div>`
                : `<ol style="margin:0 0 10px 18px;padding:0;font-size:13px;">
                    ${state.nlPlan.steps.map((s) => `<li>${esc(s.label)}</li>`).join('')}
                  </ol>`
            }
            ${state.nlPlan.preflightChecks
              .map(
                (chk) =>
                  `<div class="notice ${chk.status === 'ok' ? 'safe' : 'warn'}" style="margin:6px 0;padding:7px 10px;font-size:12px;">${chk.status === 'ok' ? '✓' : '⚠'} ${esc(chk.message)}</div>`
              )
              .join('')}
            ${
              state.nlPlan.steps.length > 0
                ? `<button class="btn btn-safe btn-sm" data-action="apply-nl-plan">${state.lang === 'zh' ? '确认并执行此计划' : 'Approve & Execute Plan'}</button>`
                : ''
            }
          </div>
        `
            : ''
        }
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 10px;flex-wrap:wrap;gap:8px;">
        <h3 style="margin:0;font-size:15px;">${state.lang === 'zh' ? '修复证据卡 (Repair Evidence)' : 'Repair Evidence Cards'} (${issues.length})</h3>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-safe btn-sm" data-action="apply-safe-fixes">${esc(t('applySafeOnly'))}</button>
          <button class="btn btn-sm" data-action="nav" data-tab="uncertainty">${state.lang === 'zh' ? '查看不确定隔离区' : 'Open Uncertainty Queue'}</button>
        </div>
      </div>

      ${
        issues.length === 0
          ? `<div class="notice safe">${state.lang === 'zh' ? '当前没有待审核的修复项，可以直接前往安全导出。' : 'All reviewable issues resolved or skipped. Ready for Safe Export.'}</div>`
          : issues
              .map(
                (iss) => `
          <div class="issue-card ${iss.severity}">
            <div class="issue-head">
              <div class="issue-title-group">
                <span class="sev-badge sev-${iss.severity}">${esc(iss.severity)}</span>
                <span class="issue-title">${esc(iss.title)}</span>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <span class="meta-chip">Risk: ${esc(iss.risk)}</span>
                <span class="meta-chip">Confidence: ${esc(iss.confidence)}</span>
                <span class="meta-chip">${iss.affectedCount} affected</span>
              </div>
            </div>
            <p class="issue-desc">${esc(iss.explanation)}</p>
            ${
              iss.sampleBefore
                ? `
              <div class="diff-box">
                <div class="diff-pane before">
                  <div class="diff-label">Before (Row ${iss.sampleRowNumber ?? '-'})</div>
                  <div>${esc(iss.sampleBefore)}</div>
                </div>
                <div class="diff-pane after">
                  <div class="diff-label">Proposed After</div>
                  <div>${esc(iss.sampleAfter || 'Review required')}</div>
                </div>
              </div>
            `
                : ''
            }
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
              ${(iss.suggestedActions || [])
                .map((act, aIdx) => {
                  if (act.ruleId === 'open_uncertainty_queue') {
                    return `<button class="btn btn-sm btn-primary" data-action="nav" data-tab="uncertainty">${esc(act.label)}</button>`;
                  }
                  if (act.ruleId === 'open_encoding_detective') {
                    return `<button class="btn btn-sm btn-primary" data-action="nav" data-tab="encoding">${esc(act.label)}</button>`;
                  }
                  if (act.ruleId === 'open_export_safety') {
                    return `<button class="btn btn-sm btn-primary" data-action="nav" data-tab="export">${esc(act.label)}</button>`;
                  }
                  return `
                    <button class="btn btn-sm" data-action="preview-rule" data-issue-id="${esc(iss.id)}" data-act-idx="${aIdx}">👁 ${state.lang === 'zh' ? '预览影响' : 'Preview'}</button>
                    <button class="btn btn-sm ${act.risk === 'low' ? 'btn-safe' : 'btn-primary'}" data-action="apply-issue-action" data-issue-id="${esc(iss.id)}" data-act-idx="${aIdx}">✓ ${esc(act.label)}</button>
                  `;
                })
                .join('')}
              <button class="btn btn-sm" data-action="skip-issue" data-issue-id="${esc(iss.id)}">${state.lang === 'zh' ? '跳过' : 'Skip'}</button>
            </div>
          </div>
        `
              )
              .join('')
      }
    `;
  }

  function renderDataGrid() {
    const activeTable = state.gridShowOriginal ? state.originalTable : state.currentTable;
    const cellMap = state.gridShowOriginal ? {} : state.diagnostics.cellIssuesMap;
    const profiles = state.diagnostics.columnProfiles;

    const searchLower = state.gridSearch.trim().toLowerCase();
    let visibleRows = activeTable.rows;

    if (state.gridErrorsOnly && !state.gridShowOriginal) {
      const errorRowSet = new Set();
      for (const key of Object.keys(cellMap)) {
        errorRowSet.add(key.split(':')[0]);
      }
      visibleRows = visibleRows.filter((r) => errorRowSet.has(r.id) || r.isBlank || r.hasQuoteIssue);
    }

    if (searchLower) {
      visibleRows = visibleRows.filter((r) =>
        r.cells.some((c) => (c || '').toLowerCase().includes(searchLower))
      );
    }

    if (state.sortCol >= 0 && state.sortDir) {
      const col = state.sortCol;
      const mult = state.sortDir === 'asc' ? 1 : -1;
      visibleRows = visibleRows.slice().sort((a, b) => {
        const va = (a.cells[col] ?? '').trim();
        const vb = (b.cells[col] ?? '').trim();
        const na = Number(va.replace(/,/g, ''));
        const nb = Number(vb.replace(/,/g, ''));
        if (va !== '' && vb !== '' && Number.isFinite(na) && Number.isFinite(nb)) {
          return (na - nb) * mult;
        }
        return va.localeCompare(vb) * mult;
      });
    }

    state.cachedFilteredRows = visibleRows;
    const rowH = state.vRowHeight;
    const overscan = 10;
    const startIdx = Math.max(0, Math.floor(state.vScrollTop / rowH) - overscan);
    const visibleCount = Math.ceil(state.vViewportHeight / rowH) + overscan * 2;
    const endIdx = Math.min(visibleRows.length, startIdx + visibleCount);
    const topSpacer = startIdx * rowH;
    const bottomSpacer = Math.max(0, (visibleRows.length - endIdx) * rowH);
    const slice = visibleRows.slice(startIdx, endIdx);

    // Selected Cell Inspector
    let inspectorHtml = `<div style="color:#64748b;font-size:13px;">${
      state.lang === 'zh'
        ? '点击左侧任意单元格查看诊断说明或直接修改数值。'
        : 'Click any cell on the left to inspect diagnostics or edit its value.'
    }</div>`;

    if (state.selectedCell) {
      const { rowId, colIdx } = state.selectedCell;
      const rowObj = state.currentTable.rows.find((r) => r.id === rowId);
      if (rowObj) {
        const val = rowObj.cells[colIdx] ?? '';
        const issueInfo = cellMap[`${rowId}:${colIdx}`];
        inspectorHtml = `
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Row ${rowObj.rowNumber} (Line ${rowObj.sourceLineStart}) · <strong>${esc(state.currentTable.headers[colIdx] || `col_${colIdx + 1}`)}</strong></div>
          ${
            issueInfo
              ? `<div class="notice ${issueInfo.severity === 'critical' || issueInfo.severity === 'high' ? 'danger' : 'warn'}" style="padding:8px 10px;font-size:12px;"><strong>${esc(issueInfo.code)}</strong><br/>${esc(issueInfo.message)}</div>`
              : `<div class="notice safe" style="padding:8px 10px;font-size:12px;">${state.lang === 'zh' ? '该单元格未发现异常。' : 'No issues detected on this cell.'}</div>`
          }
          <div class="form-field" style="margin-bottom:10px;">
            <label>${state.lang === 'zh' ? '编辑单元格值' : 'Edit Cell Value'}</label>
            <input type="text" class="input" id="inspector-cell-input" value="${esc(val)}" />
          </div>
          <button class="btn btn-primary btn-sm" data-action="save-cell-edit" data-row-id="${esc(rowId)}" data-col-idx="${colIdx}">${state.lang === 'zh' ? '保存修改' : 'Save Cell'}</button>
        `;
      }
    }

    const colOptions = state.currentTable.headers
      .map((h, i) => `<option value="${i}">${esc(h)}</option>`)
      .join('');

    return `
      <div class="card" style="padding:12px 16px;">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            <input type="text" class="input" id="grid-search-input" style="width:220px;" placeholder="${state.lang === 'zh' ? '搜索单元格内容...' : 'Search cells...'}" value="${esc(state.gridSearch)}" />
            <button class="pill-btn ${state.gridErrorsOnly ? 'active' : ''}" data-action="toggle-grid-errors">${state.lang === 'zh' ? '只看问题行' : 'Errors Only'}</button>
            <button class="pill-btn ${state.gridShowOriginal ? 'active' : ''}" data-action="toggle-grid-original">${state.gridShowOriginal ? (state.lang === 'zh' ? '正在查看：原始数据' : 'Viewing: Original') : (state.lang === 'zh' ? '正在查看：修复后数据' : 'Viewing: Cleaned')}</button>
            <button class="btn btn-sm" data-action="toggle-col-tools">🔧 ${state.lang === 'zh' ? '列工具与清洗操作' : 'Column & Cleaning Tools'}</button>
            <span style="font-size:11.5px;color:#64748b;">${state.lang === 'zh' ? '💡 拖拽表头换列 · 点击排序 · 双击单元格原地编辑 · Ctrl+Z 撤销' : '💡 Drag headers to reorder · Click to sort · Double-click cell to edit · Ctrl+Z undo'}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;font-size:12px;color:#64748b;">
            <span class="meta-chip" id="vscroll-status">Virtual Scroll: ${visibleRows.length.toLocaleString()} rows (${startIdx + 1}–${endIdx})</span>
          </div>
        </div>

        ${
          state.showColumnTools
            ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
            <div style="background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
              <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">${state.lang === 'zh' ? '重命名列 (Rename)' : 'Rename Column'}</div>
              <div class="form-row" style="margin-bottom:0;">
                <select class="select" id="tool-rename-col">${colOptions}</select>
                <input class="input" id="tool-rename-val" placeholder="new_name" />
                <button class="btn btn-sm btn-primary" data-action="tool-rename">${state.lang === 'zh' ? '应用' : 'Apply'}</button>
              </div>
            </div>
            <div style="background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
              <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">${state.lang === 'zh' ? '拆分列 (Split)' : 'Split Column'}</div>
              <div class="form-row" style="margin-bottom:0;">
                <select class="select" id="tool-split-col">${colOptions}</select>
                <input class="input" id="tool-split-sep" value=" " placeholder="sep" style="max-width:65px;" />
                <button class="btn btn-sm btn-primary" data-action="tool-split">${state.lang === 'zh' ? '拆分' : 'Split'}</button>
              </div>
            </div>
            <div style="background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
              <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">${state.lang === 'zh' ? '合并两列 (Merge)' : 'Merge Columns'}</div>
              <div class="form-row" style="margin-bottom:0;">
                <select class="select" id="tool-merge-a">${colOptions}</select>
                <select class="select" id="tool-merge-b">${colOptions}</select>
                <button class="btn btn-sm btn-primary" data-action="tool-merge">${state.lang === 'zh' ? '合并' : 'Merge'}</button>
              </div>
            </div>
            <div style="background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
              <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">${state.lang === 'zh' ? '主键去重 (Dedupe by Key)' : 'Deduplicate by Key'}</div>
              <div class="form-row" style="margin-bottom:0;">
                <select class="select" id="tool-dedupe-col">${colOptions}</select>
                <select class="select" id="tool-dedupe-keep">
                  <option value="first">Keep First</option>
                  <option value="last">Keep Last</option>
                </select>
                <button class="btn btn-sm btn-primary" data-action="tool-dedupe-key">${state.lang === 'zh' ? '去重' : 'Dedupe'}</button>
              </div>
            </div>
            <div style="background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
              <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">${state.lang === 'zh' ? '快捷单列清洗' : 'Quick Column Clean'}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn btn-sm" data-action="quick-rule" data-rule="trim_whitespace">Trim All</button>
                <button class="btn btn-sm" data-action="quick-rule" data-rule="standardize_empty_values">Clean N/A</button>
                <button class="btn btn-sm" data-action="quick-rule" data-rule="remove_blank_rows">Drop Blanks</button>
              </div>
            </div>
          </div>
        `
            : ''
        }
      </div>

      <div class="grid-layout">
        <div class="table-wrap" id="vscroll-viewport" style="height:520px;max-height:520px;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:48px;text-align:right;">#</th>
                ${activeTable.headers
                  .map((h, i) => {
                    const prof = profiles[i];
                    const sortIcon = state.sortCol === i ? (state.sortDir === 'asc' ? ' ↑' : ' ↓') : '';
                    return `<th class="col-draggable" draggable="true" data-col-idx="${i}" title="${state.lang === 'zh' ? '拖拽可调整列顺序，点击列名排序，点 ⋯ 快捷清洗' : 'Drag to reorder, click name to sort, click ⋯ for quick column actions'}">
                      <div class="th-inner">
                        <button class="th-sort-btn" data-action="sort-col" data-col-idx="${i}">${esc(h)}${sortIcon}</button>
                        <button class="th-menu-btn" data-action="open-col-menu" data-col-idx="${i}" title="${state.lang === 'zh' ? '该列快捷操作' : 'Column actions'}">⋯</button>
                      </div>
                      <div style="font-size:10px;font-weight:500;color:#64748b;">${esc(prof?.inferredType || 'text')} · ${Math.round((prof?.nullRate || 0) * 100)}% null</div>
                    </th>`;
                  })
                  .join('')}
              </tr>
            </thead>
            <tbody id="vscroll-tbody">
              ${
                slice.length === 0
                  ? `<tr><td colspan="${activeTable.headers.length + 1}" style="text-align:center;padding:24px;color:#64748b;">No matching rows</td></tr>`
                  : `${topSpacer > 0 ? `<tr style="height:${topSpacer}px;"><td colspan="${activeTable.headers.length + 1}" style="padding:0;border:none;"></td></tr>` : ''}` +
                    slice
                      .map(
                        (r) => `
                  <tr class="vrow">
                    <td class="row-num">${r.rowNumber}</td>
                    ${activeTable.headers
                      .map((_, colIdx) => {
                        const cellVal = r.cells[colIdx] ?? '';
                        const iss = cellMap[`${r.id}:${colIdx}`];
                        const cls = iss ? `cell-${iss.severity}` : '';
                        const isEditing = !state.gridShowOriginal && state.editingCell && state.editingCell.rowId === r.id && state.editingCell.colIdx === colIdx;
                        if (isEditing) {
                          return `<td style="padding:2px 4px;"><input class="inline-cell-editor" id="inline-cell-editor" data-row-id="${esc(r.id)}" data-col-idx="${colIdx}" value="${esc(cellVal)}" /></td>`;
                        }
                        return `<td class="${cls}" title="${esc(iss ? iss.message : cellVal)}" data-action="select-cell" data-row-id="${esc(r.id)}" data-col-idx="${colIdx}">${esc(cellVal)}</td>`;
                      })
                      .join('')}
                  </tr>
                `
                      )
                      .join('') +
                    `${bottomSpacer > 0 ? `<tr style="height:${bottomSpacer}px;"><td colspan="${activeTable.headers.length + 1}" style="padding:0;border:none;"></td></tr>` : ''}`
              }
            </tbody>
          </table>
        </div>

        <div class="card" style="margin-bottom:0;">
          <h3 class="card-title" style="font-size:14.5px;">${state.lang === 'zh' ? '单元格诊断检查器' : 'Cell Inspector'}</h3>
          ${inspectorHtml}
        </div>
      </div>
    `;
  }

  function renderMappingStudio() {
    const pack = C.BUSINESS_PACKS[state.selectedPackId] || C.BUSINESS_PACKS.ecommerce;

    return `
      <div class="card">
        <h2 class="card-title">${state.lang === 'zh' ? '字段映射工作室与供应商记忆 (Supplier Memory)' : 'Column Mapping Studio & Supplier Memory'}</h2>
        <p class="card-sub">${
          state.lang === 'zh'
            ? '将不同供应商的杂乱列名映射到标准业务模板；保存后下次导入自动复用，列结构变化时主动告警。'
            : 'Map supplier columns to a standard Business Pack. Save as a Supplier Memory template to auto-reuse and detect Schema Drift next time.'
        }</p>

        <div class="form-row">
          <div class="form-field">
            <label>${state.lang === 'zh' ? '选择业务规则包 (Business Pack)' : 'Target Business Pack'}</label>
            <select class="select" id="pack-select">
              ${Object.values(C.BUSINESS_PACKS)
                .map(
                  (p) =>
                    `<option value="${p.id}" ${state.selectedPackId === p.id ? 'selected' : ''}>${esc(state.lang === 'zh' ? p.nameZh : p.name)}</option>`
                )
                .join('')}
            </select>
          </div>
          <div class="form-field">
            <label>${state.lang === 'zh' ? '已保存供应商模板' : 'Saved Supplier Templates'}</label>
            <select class="select" id="saved-template-select">
              <option value="">-- ${state.lang === 'zh' ? '选择模板' : 'Select template'} (${state.templates.length}) --</option>
              ${state.templates
                .map(
                  (tpl) =>
                    `<option value="${esc(tpl.name)}" ${state.activeTemplateName === tpl.name ? 'selected' : ''}>${esc(tpl.name)} (v${tpl.version})</option>`
                )
                .join('')}
            </select>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm" data-action="load-template">${state.lang === 'zh' ? '载入模板' : 'Load'}</button>
            <button class="btn btn-sm" data-action="export-templates">${state.lang === 'zh' ? '导出模板JSON' : 'Export JSON'}</button>
          </div>
        </div>

        ${
          state.schemaDrift
            ? `
          <div class="notice ${state.schemaDrift.hasDrift ? 'warn' : 'safe'}">
            <strong>${state.lang === 'zh' ? '供应商模板匹配：' : 'Supplier Template Matched:'} ${esc(state.schemaDrift.templateName)} (v${state.schemaDrift.templateVersion})</strong>
            ${
              state.schemaDrift.hasDrift
                ? `<div style="margin-top:4px;">⚠ Schema Drift Detected — Added: <code>${esc(state.schemaDrift.addedColumns.join(', ') || 'none')}</code> | Missing: <code>${esc(state.schemaDrift.missingColumns.join(', ') || 'none')}</code></div>`
                : `<div style="margin-top:4px;">✓ ${state.lang === 'zh' ? '所有列结构与历史模板完全一致。' : 'All columns match the saved supplier schema.'}</div>`
            }
          </div>
        `
            : ''
        }

        <div class="table-wrap" style="max-height:360px;margin-bottom:14px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>${state.lang === 'zh' ? '源文件列名' : 'Source Column'}</th>
                <th>${state.lang === 'zh' ? '目标标准字段' : 'Target Standard Field'}</th>
                <th>${state.lang === 'zh' ? '匹配方式' : 'Match Type'}</th>
                <th>${state.lang === 'zh' ? '匹配依据' : 'Reason'}</th>
              </tr>
            </thead>
            <tbody>
              ${state.mappings
                .map(
                  (m, idx) => `
                <tr>
                  <td><strong>${esc(m.sourceColumn)}</strong></td>
                  <td>
                    <select class="select" data-action="change-mapping" data-idx="${idx}">
                      <option value="">-- ${state.lang === 'zh' ? '保持原列名 / 不映射' : 'Keep original / Unmapped'} --</option>
                      ${pack.fields
                        .map(
                          (f) =>
                            `<option value="${esc(f.key)}" ${m.targetField === f.key ? 'selected' : ''}>${esc(f.label)} (${esc(f.key)})${f.required ? ' *' : ''}</option>`
                        )
                        .join('')}
                    </select>
                  </td>
                  <td><span class="sev-badge sev-${m.matchType === 'exact' ? 'safe' : m.matchType === 'alias' ? 'info' : m.matchType === 'inferred' ? 'warning' : 'high'}">${esc(m.matchType)}</span></td>
                  <td style="white-space:normal;">${esc(m.reason)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="form-row" style="margin-bottom:0;">
          <div class="form-field">
            <label>${state.lang === 'zh' ? '保存为供应商模板名称' : 'Save as Supplier Template Name'}</label>
            <input type="text" class="input" id="template-name-input" placeholder="e.g. Supplier A / Product Import" value="${esc(state.activeTemplateName)}" />
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <label style="font-size:12.5px;display:flex;align-items:center;gap:5px;cursor:pointer;">
              <input type="checkbox" id="keep-unmapped-chk" ${state.keepUnmapped ? 'checked' : ''} />
              ${state.lang === 'zh' ? '保留未映射列' : 'Keep unmapped columns'}
            </label>
            <button class="btn" data-action="save-template">💾 ${state.lang === 'zh' ? '保存供应商模板' : 'Save Template'}</button>
            <button class="btn btn-primary" data-action="apply-mapping">✓ ${state.lang === 'zh' ? '应用字段映射' : 'Apply Mapping'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderUncertaintyQueue() {
    const pending = state.uncertaintyItems.filter((u) => u.status === 'pending');

    return `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">${state.lang === 'zh' ? '已自动安全修复' : 'Auto-Fixed (Safe)'}</div>
          <div class="kpi-value safe">${state.autoFixedCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${state.lang === 'zh' ? '用户已确认修复' : 'User Confirmed'}</div>
          <div class="kpi-value brand">${state.userConfirmedCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${state.lang === 'zh' ? '尚待检查 (隔离区)' : 'Pending Review'}</div>
          <div class="kpi-value warning">${pending.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${state.lang === 'zh' ? '原样保留' : 'Kept Original'}</div>
          <div class="kpi-value">${state.keptOriginalCount}</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <div>
            <h2 class="card-title" style="margin:0;">${state.lang === 'zh' ? '不确定数据隔离区 (Uncertainty Queue)' : 'Uncertainty Queue'}</h2>
            <p class="card-sub" style="margin:2px 0 0;">${
              state.lang === 'zh'
                ? '系统无法可靠判断的坏行与异常单元格集中在这里，绝不静默覆盖。您可以逐条决定或单独导出。'
                : 'Ambiguous or broken rows are quarantined here rather than silently guessed. Decide per row or export separately.'
            }</p>
          </div>
          <button class="btn btn-sm" data-action="export-unresolved" ${pending.length === 0 ? 'disabled' : ''}>⬇ ${state.lang === 'zh' ? '单独导出未解决行 (CSV)' : 'Export Unresolved Separately'}</button>
        </div>

        ${
          pending.length === 0
            ? `<div class="notice safe">${state.lang === 'zh' ? '隔离区已清空，所有不确定项均已处理。' : 'Uncertainty Queue is clear.'}</div>`
            : pending
                .map(
                  (u) => `
            <div class="issue-card warning">
              <div class="issue-head">
                <div class="issue-title-group">
                  <span class="sev-badge sev-warning">${esc(u.issueCode)}</span>
                  <span class="issue-title">${esc(u.title)}</span>
                </div>
                <span class="meta-chip">Source Line ${u.sourceLine}</span>
              </div>
              <p class="issue-desc">${esc(u.reason)}</p>
              <div class="diff-box">
                <div class="diff-pane before">
                  <div class="diff-label">Original Raw Line</div>
                  <div>${esc(u.raw)}</div>
                </div>
                ${
                  u.candidateFix
                    ? `
                  <div class="diff-pane after">
                    <div class="diff-label">Candidate Fix (${esc(u.candidateFix.description)})</div>
                    <div>${esc(u.candidateFix.proposedCells.join(' | '))}</div>
                  </div>
                `
                    : `
                  <div class="diff-pane">
                    <div class="diff-label">Candidate Fix</div>
                    <div style="color:#64748b;">No safe automatic guess — edit manually or keep original.</div>
                  </div>
                `
                }
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${
                  u.candidateFix
                    ? `<button class="btn btn-sm btn-safe" data-action="uq-accept" data-uq-id="${esc(u.id)}">✓ Accept Candidate</button>`
                    : ''
                }
                <button class="btn btn-sm btn-primary" data-action="uq-edit" data-uq-id="${esc(u.id)}">✎ Edit Manually</button>
                <button class="btn btn-sm" data-action="uq-keep" data-uq-id="${esc(u.id)}">Keep Original</button>
                <button class="btn btn-sm btn-danger-outline" data-action="uq-exclude" data-uq-id="${esc(u.id)}">Exclude Row</button>
              </div>
            </div>
          `
                )
                .join('')
        }
      </div>
    `;
  }

  function renderBatchAndDiff() {
    const alignment =
      state.batchFiles.length >= 2 ? C.inspectBatchAlignment(state.batchFiles) : null;

    return `
      <div class="card">
        <h2 class="card-title">${state.lang === 'zh' ? '多文件批量急救与安全合并 (Multi-file Batch Rescue)' : 'Multi-File Batch Rescue & Safe Merge'}</h2>
        <p class="card-sub">${
          state.lang === 'zh'
            ? '合并前先展示字段对应关系与列差异，绝不自动将不同意义的列合并。支持跨文件主键去重。'
            : 'Inspect column alignment and schema conflicts before merging multiple supplier CSVs. Optional cross-file deduplication.'
        }</p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <input type="file" id="batch-file-input" accept=".csv,.tsv,.txt,.xlsx" multiple style="display:none;" />
          <button class="btn btn-primary btn-sm" data-action="trigger-batch-input">+ ${state.lang === 'zh' ? '添加多个 CSV 文件' : 'Add Multiple CSV Files'}</button>
          <button class="btn btn-sm" data-action="load-batch-demo">📦 ${state.lang === 'zh' ? '载入双供应商演示批次' : 'Load 2-Supplier Demo Batch'}</button>
          ${state.batchFiles.length > 0 ? `<button class="btn btn-sm btn-danger-outline" data-action="clear-batch">${state.lang === 'zh' ? '清空批次' : 'Clear Batch'}</button>` : ''}
        </div>

        ${
          state.batchFiles.length > 0
            ? `
          <div class="table-wrap" style="max-height:200px;margin-bottom:12px;">
            <table class="data-table">
              <thead><tr><th>File</th><th>Rows</th><th>Columns</th><th>Headers</th></tr></thead>
              <tbody>
                ${state.batchFiles
                  .map(
                    (f) => `<tr><td><strong>${esc(f.fileName)}</strong></td><td>${f.rows.length}</td><td>${f.headers.length}</td><td>${esc(f.headers.join(', '))}</td></tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        ${
          alignment
            ? `
          <div class="notice ${alignment.isSchemaIdentical ? 'safe' : 'warn'}">
            <strong>${state.lang === 'zh' ? '字段对齐检查：' : 'Schema Alignment Check:'}</strong>
            ${
              alignment.isSchemaIdentical
                ? 'All files share identical headers.'
                : `${alignment.schemaConflicts.length} column difference(s) found: ` +
                  alignment.schemaConflicts.map((c) => `${c.column} (missing in ${c.missingIn.join(', ')})`).join('; ')
            }
          </div>
          <div class="form-row" style="margin-bottom:0;">
            <div class="form-field">
              <label>${state.lang === 'zh' ? '跨文件去重主键（可选）' : 'Cross-file Dedupe Key (Optional)'}</label>
              <select class="select" id="batch-dedupe-select">
                <option value="">-- No deduplication --</option>
                ${alignment.unionHeaders.map((h) => `<option value="${esc(h)}" ${state.batchDedupeKey === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
              <label style="font-size:12.5px;display:flex;align-items:center;gap:5px;">
                <input type="checkbox" id="batch-source-chk" ${state.batchIncludeSource ? 'checked' : ''} />
                Add <code>_source_file</code> column
              </label>
              <button class="btn btn-safe" data-action="merge-batch">✓ ${state.lang === 'zh' ? '合并并在工作台打开' : 'Merge & Open in Workspace'}</button>
            </div>
          </div>
        `
            : ''
        }
      </div>

      <div class="card">
        <h2 class="card-title">${state.lang === 'zh' ? 'CSV 差异对比 (CSV Diff)' : 'CSV Compare / Diff'}</h2>
        <p class="card-sub">${
          state.lang === 'zh'
            ? '对比原始文件与清洗后版本，或上传另一份 CSV 按主键查看新增、删除与修改的单元格。'
            : 'Compare Original vs Cleaned, or upload a second CSV to view added, removed, and modified cells by primary key.'
        }</p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
          <button class="btn btn-primary btn-sm" data-action="diff-original-vs-clean" ${!state.originalTable ? 'disabled' : ''}>⚖ ${state.lang === 'zh' ? '对比：原始 vs 当前修复后' : 'Compare: Original vs Cleaned'}</button>
          <input type="file" id="diff-file-input" accept=".csv,.tsv,.txt,.xlsx" style="display:none;" />
          <button class="btn btn-sm" data-action="trigger-diff-input" ${!state.currentTable ? 'disabled' : ''}>📂 ${state.lang === 'zh' ? '上传第二个 CSV 对比' : 'Upload 2nd CSV to Compare'}</button>
          ${
            state.currentTable
              ? `
            <select class="select" id="diff-key-select" style="width:180px;">
              <option value="-1">Compare by Row Index</option>
              ${state.currentTable.headers.map((h, i) => `<option value="${i}" ${state.diffKeyCol === i ? 'selected' : ''}>Key: ${esc(h)}</option>`).join('')}
            </select>
          `
              : ''
          }
        </div>

        ${
          state.diffResult
            ? `
          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Added Rows</div><div class="kpi-value safe">+${state.diffResult.summary.addedCount}</div></div>
            <div class="kpi-card"><div class="kpi-label">Removed Rows</div><div class="kpi-value critical">-${state.diffResult.summary.removedCount}</div></div>
            <div class="kpi-card"><div class="kpi-label">Modified Rows</div><div class="kpi-value warning">${state.diffResult.summary.modifiedCount}</div></div>
            <div class="kpi-card"><div class="kpi-label">Unchanged</div><div class="kpi-value">${state.diffResult.summary.unchangedCount}</div></div>
          </div>
          <div class="table-wrap" style="max-height:260px;">
            <table class="data-table">
              <thead><tr><th>Key (${esc(state.diffResult.keyColumn)})</th><th>Change Type</th><th>Details</th></tr></thead>
              <tbody>
                ${state.diffResult.modified
                  .slice(0, 50)
                  .map(
                    (m) => `<tr><td><strong>${esc(m.key)}</strong></td><td><span class="sev-badge sev-warning">Modified</span></td><td style="white-space:normal;">${m.changes.map((c) => `${esc(c.column)}: "${esc(c.before)}" → "${esc(c.after)}"`).join(' ; ')}</td></tr>`
                  )
                  .join('')}
                ${state.diffResult.removed
                  .slice(0, 25)
                  .map(
                    (r) => `<tr><td><strong>${esc(r.key)}</strong></td><td><span class="sev-badge sev-critical">Removed</span></td><td>${esc(r.cells.slice(0, 4).join(' | '))}</td></tr>`
                  )
                  .join('')}
                ${state.diffResult.added
                  .slice(0, 25)
                  .map(
                    (a) => `<tr><td><strong>${esc(a.key)}</strong></td><td><span class="sev-badge sev-safe">Added</span></td><td>${esc(a.cells.slice(0, 4).join(' | '))}</td></tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  function renderSafeExport() {
    const formulaCount = state.diagnostics.formulaHits.length;
    const origRows = state.originalTable.rows.length;
    const currRows = state.currentTable.rows.length;
    const removedTotal = Math.max(0, origRows - currRows);
    const cellsMod = state.appliedRules.reduce((a, r) => a + (r.affectedCells || 0), 0);

    return `
      <div class="card">
        <h2 class="card-title">${state.lang === 'zh' ? '修复完整性检查 (Before / After Integrity Check)' : 'Before / After Integrity Check'}</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-label">${state.lang === 'zh' ? '原始行数' : 'Original Rows'}</div><div class="kpi-value">${origRows}</div></div>
          <div class="kpi-card"><div class="kpi-label">${state.lang === 'zh' ? '输出行数' : 'Output Rows'}</div><div class="kpi-value safe">${currRows}</div></div>
          <div class="kpi-card"><div class="kpi-label">${state.lang === 'zh' ? '移除行数' : 'Rows Removed'}</div><div class="kpi-value ${removedTotal > 0 ? 'warning' : ''}">${removedTotal}</div></div>
          <div class="kpi-card"><div class="kpi-label">${state.lang === 'zh' ? '修改单元格数' : 'Cells Modified'}</div><div class="kpi-value brand">${cellsMod}</div></div>
        </div>

        <div style="font-size:12.5px;margin-bottom:10px;">
          <div><strong>Input SHA-256:</strong> <code class="mono">${esc(state.inputHash)}</code></div>
          ${
            state.lastExportMeta
              ? `<div style="margin-top:4px;"><strong>Output SHA-256:</strong> <code class="mono">${esc(state.lastExportMeta.outputHash)}</code> (${C.formatBytes(state.lastExportMeta.byteLength)})</div>`
              : ''
          }
          <div style="color:#64748b;font-size:11.5px;margin-top:4px;">${
            state.lang === 'zh'
              ? '说明：SHA-256 仅用于文件完整性校验，不作为隐私加密。'
              : 'Note: SHA-256 hashes verify file integrity only and are not a privacy mechanism.'
          }</div>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">${state.lang === 'zh' ? '安全导出设置 (Safe Export)' : 'Safe Export Settings'}</h2>

        ${
          formulaCount > 0
            ? `
          <div class="notice danger">
            <strong>⚠ OWASP CSV Formula Injection ${state.lang === 'zh' ? '风险提醒' : 'Warning'}:</strong>
            ${formulaCount} ${
                state.lang === 'zh'
                  ? '个单元格以 =、+、- 或 @ 开头。在 Excel 或 LibreOffice 打开时可能被解释为公式。请注意：启用文本保护会改变导出单元格的值，且不同表格软件在保存/重新打开后的行为可能不同。'
                  : 'cell(s) start with =, +, -, or @ and may be interpreted as formulas by Excel or LibreOffice. Text protection modifies exported values; no single escaping method is guaranteed across all spreadsheet apps and re-save cycles.'
              }
          </div>
        `
            : `<div class="notice safe">✓ ${state.lang === 'zh' ? '未检测到以公式敏感字符 (=, +, -, @) 开头的单元格。' : 'No formula-sensitive cells (=, +, -, @) detected.'}</div>`
        }

        <div class="form-row">
          <div class="form-field">
            <label>${state.lang === 'zh' ? '导出格式' : 'Export Format'}</label>
            <select class="select" id="export-format-select">
              <option value="csv-bom" ${state.exportFormat === 'csv-bom' ? 'selected' : ''}>CSV UTF-8 with BOM (Recommended for Excel)</option>
              <option value="csv" ${state.exportFormat === 'csv' ? 'selected' : ''}>CSV UTF-8 (Standard)</option>
              <option value="tsv" ${state.exportFormat === 'tsv' ? 'selected' : ''}>TSV UTF-8 (Tab-Separated)</option>
              <option value="json" ${state.exportFormat === 'json' ? 'selected' : ''}>JSON (Array of Objects)</option>
              <option value="excel-xml" ${state.exportFormat === 'excel-xml' ? 'selected' : ''}>Excel SpreadsheetML (.xls — Preserves Leading Zeros)</option>
              <option value="custom" ${state.exportFormat === 'custom' ? 'selected' : ''}>Custom Delimiter CSV</option>
            </select>
          </div>
          ${
            state.exportFormat === 'custom'
              ? `
            <div class="form-field" style="max-width:120px;">
              <label>Delimiter</label>
              <input class="input" id="export-custom-delim" value="${esc(state.customDelimiter)}" maxlength="2" />
            </div>
          `
              : ''
          }
          <div class="form-field">
            <label>${state.lang === 'zh' ? '公式注入防护策略' : 'Formula Injection Protection'}</label>
            <select class="select" id="export-formula-select">
              <option value="prefix_quote" ${state.formulaProtection === 'prefix_quote' ? 'selected' : ''}>Prefix single quote (') on risky cells</option>
              <option value="prefix_tab" ${state.formulaProtection === 'prefix_tab' ? 'selected' : ''}>Prefix tab (\\t) on risky cells</option>
              <option value="none" ${state.formulaProtection === 'none' ? 'selected' : ''}>Keep original values unmodified</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
          <button class="btn btn-primary" data-action="do-export">⬇ ${esc(t('exportClean'))}</button>
          <button class="btn" data-action="download-receipt-html">🧾 ${esc(t('receiptHtml'))}</button>
          <button class="btn" data-action="download-receipt-json">📄 ${esc(t('receiptJson'))}</button>
          <button class="btn" data-action="preview-receipt">👁 ${state.lang === 'zh' ? '预览修复收据' : 'Preview Receipt'}</button>
        </div>
      </div>
    `;
  }

  function render() {
    const app = document.getElementById('app');
    if (!app) return;

    let body = '';
    if (state.activeTab === 'home') body = renderHome();
    else if (state.activeTab === 'health') body = renderHealthReport();
    else if (state.activeTab === 'encoding') body = renderEncodingDetective();
    else if (state.activeTab === 'review') body = renderReviewFixes();
    else if (state.activeTab === 'grid') body = renderDataGrid();
    else if (state.activeTab === 'mapping') body = renderMappingStudio();
    else if (state.activeTab === 'uncertainty') body = renderUncertaintyQueue();
    else if (state.activeTab === 'batch') body = renderBatchAndDiff();
    else if (state.activeTab === 'export') body = renderSafeExport();

    app.innerHTML = `
      ${renderTopbar()}
      ${renderTabRail()}
      <main class="container">
        ${
          state.isProcessing
            ? `<div class="progress-banner">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                  <div><strong>${state.lang === 'zh' ? '后台引擎正在处理中...' : 'Engine processing in background...'}</strong> <span style="color:#64748b;font-size:12.5px;">(${esc(state.progressPhase)} · ${state.progressRows.toLocaleString()} rows · ${state.progressPct}%)</span></div>
                  <button class="btn btn-sm btn-danger-outline" data-action="cancel-job">✕ ${state.lang === 'zh' ? '立即取消' : 'Cancel'}</button>
                </div>
                <div class="progress-track"><div class="progress-fill" style="width:${state.progressPct}%;"></div></div>
              </div>`
            : ''
        }
        ${renderFileStrip()}
        <div class="view-enter">${body}</div>
      </main>
    `;

    state.justLoaded = false;
    state.justHealed = false;
    bindDynamicInputs();
  }

  // ============================================================================
  // Cinema-Grade Three.js 3D Matrix Digital Rain with Multi-Pass GPU Bloom,
  // Live GLSL Glyph-Atlas Morphing, Anamorphic Halation, Volumetric Mist &
  // Cursor Light-Field (Zero solid boxes/pillars; auto-pauses off Home tab)
  // ============================================================================
  let restorationRafId = null;
  let restorationCleanup = null;

  function stopRestorationCanvas() {
    if (restorationRafId) {
      cancelAnimationFrame(restorationRafId);
      restorationRafId = null;
    }
    if (typeof restorationCleanup === 'function') {
      restorationCleanup();
      restorationCleanup = null;
    }
  }

  const MATRIX_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#,;@=+-ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

  function createCrispGlyphAtlas(THREE) {
    const size = 1024;
    const grid = 8; // 64 crisp high-res glyphs
    const cell = size / grid;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    g.clearRect(0, 0, size, size);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 84px "SF Mono", ui-monospace, Menlo, Consolas, monospace';

    for (let i = 0; i < grid * grid; i++) {
      const col = i % grid;
      const row = Math.floor(i / grid);
      const ch = MATRIX_CHARS[i % MATRIX_CHARS.length];
      const cx = col * cell + cell * 0.5;
      const cy = row * cell + cell * 0.54;

      // Soft inner phosphor halo baked into alpha + razor-sharp core
      g.save();
      g.shadowColor = 'rgba(255, 255, 255, 0.95)';
      g.shadowBlur = 14;
      g.fillStyle = '#ffffff';
      g.fillText(ch, cx, cy);
      g.shadowBlur = 0;
      g.fillText(ch, cx, cy);
      g.restore();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.flipY = false;
    return tex;
  }

  function launchThreeJsTheater(stage, canvas, reducedMotion) {
    const THREE = window.THREE;
    if (!THREE) return false;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return false;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x020504, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020504, 0.036);

    const camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.1, 130);
    camera.position.set(0, 0, 15.5);

    const glyphAtlas = createCrispGlyphAtlas(THREE);

    // 1. 180 Dense 3D Instanced-Shader Matrix Rain Columns across Deep 3D Space
    //    Each column renders 34 live-morphing glowing glyphs in a single GPU pass!
    const COL_COUNT = 180;
    const baseGeo = new THREE.PlaneGeometry(0.62, 23.0);

    const rainMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uAtlas: { value: glyphAtlas },
        uTime: { value: 0 },
        uCursorWorld: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: `
        attribute vec4 aStream; // x: speed, y: phase, z: tailLen, w: seed
        varying vec2 vUv;
        varying vec4 vStream;
        varying float vDepth;
        varying float vCursorProx;
        uniform vec3 uCursorWorld;

        void main() {
          vUv = uv;
          vStream = aStream;
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vec4 mvPos = viewMatrix * worldPos;
          vDepth = -mvPos.z;
          float dCur = length(worldPos.xy - uCursorWorld.xy);
          vCursorProx = exp(-dCur * 0.24);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uAtlas;
        uniform float uTime;
        varying vec2 vUv;
        varying vec4 vStream;
        varying float vDepth;
        varying float vCursorProx;

        float hash11(float p) {
          p = fract(p * 0.1031);
          p *= p + 33.33;
          p *= p + p;
          return fract(p);
        }

        void main() {
          float cells = 34.0;
          float row = floor((1.0 - vUv.y) * cells); // 0 at top -> 33 at bottom
          vec2 cellUv = vec2(vUv.x, fract((1.0 - vUv.y) * cells));

          float speed = vStream.x;
          float phase = vStream.y;
          float tailLen = vStream.z;
          float seed = vStream.w;

          // Raindrop head travels downward continuously
          float headPos = mod(uTime * speed + phase * cells, cells + tailLen);
          float dist = headPos - row;

          // Secondary offset drop on the same 3D column for cinema density
          float headPos2 = mod(uTime * speed * 0.88 + (phase + 0.52) * cells, cells + tailLen);
          float dist2 = headPos2 - row;

          float b1 = (dist >= 0.0 && dist < tailLen) ? pow(1.0 - dist / tailLen, 1.65) : 0.0;
          float h1 = (dist >= 0.0 && dist < 1.15) ? (1.0 - dist / 1.15) : 0.0;

          float b2 = (dist2 >= 0.0 && dist2 < tailLen * 0.85) ? pow(1.0 - dist2 / (tailLen * 0.85), 1.75) * 0.78 : 0.0;
          float h2 = (dist2 >= 0.0 && dist2 < 1.0) ? (1.0 - dist2) * 0.85 : 0.0;

          float trail = max(b1, b2);
          float head = max(h1, h2);
          if (trail < 0.015 && head < 0.015) discard;

          // Live authentic Matrix glyph morphing
          float flickerStep = floor(uTime * (2.6 + hash11(seed + row) * 4.5));
          float glyphIdx = floor(hash11(seed * 19.3 + row * 7.1 + flickerStep * 0.37) * 64.0);
          float gx = mod(glyphIdx, 8.0);
          float gy = floor(glyphIdx / 8.0);
          vec2 atlasUv = (vec2(gx, gy) + clamp(cellUv, 0.06, 0.94)) / 8.0;

          float mask = texture2D(uAtlas, atlasUv).a;
          if (mask < 0.03) discard;

          // Cinema Color Palette: Incandescent White-Mint Head -> Electric Emerald -> Deep Jade + subtle Gold Glint
          vec3 deepJade = vec3(0.02, 0.38, 0.22);
          vec3 neonEmerald = vec3(0.10, 0.98, 0.56);
          vec3 whiteHot = vec3(0.92, 1.0, 0.96);
          vec3 brassGlint = vec3(0.95, 0.80, 0.45);

          vec3 col = mix(deepJade, neonEmerald, smoothstep(0.05, 0.88, trail));
          // Rare subtle gold data-calibration glints
          float isGold = step(0.965, hash11(seed * 3.7 + row * 11.3));
          col = mix(col, brassGlint, isGold * 0.65);

          // Blinding incandescent drop head (feeds GPU Bloom!)
          col = mix(col, whiteHot * 2.4, smoothstep(0.05, 0.9, head));

          // Interactive cursor light-field boost
          col *= (1.0 + vCursorProx * 0.75);

          // 3D atmospheric depth fade + soft top/bottom vignette
          float depthFade = smoothstep(44.0, 7.0, vDepth) * smoothstep(1.5, 4.5, vDepth);
          float edgeY = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
          float alpha = mask * max(trail * 0.95, head * 1.35) * depthFade * edgeY;

          gl_FragColor = vec4(col * alpha, alpha);
        }
      `,
    });

    const instancedRain = new THREE.InstancedMesh(baseGeo, rainMat, COL_COUNT);
    const streamAttr = new Float32Array(COL_COUNT * 4);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < COL_COUNT; i++) {
      // Distribute across 3D volume: far background bokeh (-26) to rushing foreground (+8)
      const t = i / COL_COUNT;
      const z = -26 + t * 34 + Math.sin(i * 2.7) * 1.4;
      const spreadX = 16 + Math.max(0, -z) * 0.95;
      const x = (((i * 0.6180339887) % 1) * 2 - 1) * spreadX;
      const y = (Math.cos(i * 1.91) * 2.8);
      const scale = 0.72 + (i % 5) * 0.11;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(scale, 1.0, 1.0);
      dummy.updateMatrix();
      instancedRain.setMatrixAt(i, dummy.matrix);

      streamAttr[i * 4 + 0] = 5.2 + (i % 9) * 1.15;      // speed
      streamAttr[i * 4 + 1] = (i * 0.317) % 1.0;         // phase
      streamAttr[i * 4 + 2] = 9.0 + (i % 10) * 1.25;     // tailLen
      streamAttr[i * 4 + 3] = i + 1.0;                   // seed
    }
    instancedRain.instanceMatrix.needsUpdate = true;
    baseGeo.setAttribute('aStream', new THREE.InstancedBufferAttribute(streamAttr, 4));
    scene.add(instancedRain);

    // 2. Volumetric Emerald Atmospheric Light Cones (subtle god-rays behind the rain)
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float b = pow(sin(vUv.x * 3.14159), 2.4);
          float v = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.1, vUv.y);
          float p = 0.72 + 0.28 * sin(uTime * 0.8 + vUv.x * 5.0);
          vec3 col = mix(vec3(0.03, 0.45, 0.28), vec3(0.18, 0.85, 0.55), vUv.y);
          gl_FragColor = vec4(col, b * v * p * 0.08);
        }
      `,
    });
    const beamGeo = new THREE.PlaneGeometry(10, 28);
    [-12, -2, 8, 17].forEach((bx, idx) => {
      const m = new THREE.Mesh(beamGeo, beamMat);
      m.position.set(bx, 2, -16 - (idx % 2) * 4);
      m.rotation.z = -0.14;
      scene.add(m);
    });

    // 3. 750 3D Floating Phosphor Dust Motes for Cinema Atmospheric Depth
    const DUST_COUNT = 750;
    const dPos = new Float32Array(DUST_COUNT * 3);
    const dCol = new Float32Array(DUST_COUNT * 3);
    const cMint = new THREE.Color(0x6ee7b7);
    const cGold = new THREE.Color(0xd4af67);
    for (let i = 0; i < DUST_COUNT; i++) {
      dPos[i * 3] = (Math.random() - 0.5) * 48;
      dPos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      dPos[i * 3 + 2] = -24 + Math.random() * 32;
      const c = i % 5 === 0 ? cGold : cMint;
      dCol[i * 3] = c.r; dCol[i * 3 + 1] = c.g; dCol[i * 3 + 2] = c.b;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
    const dMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dust = new THREE.Points(dGeo, dMat);
    scene.add(dust);

    // 4. Native Multi-Pass GPU Bloom + Anamorphic Streak + ACES Filmic Composite
    const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    let sceneRT = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    let bloomA = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    let bloomB = new THREE.WebGLRenderTarget(2, 2, rtOpts);

    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    const quadVs = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

    const threshMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: quadVs,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float soft = smoothstep(0.22, 0.75, lum);
          gl_FragColor = vec4(c * soft, 1.0);
        }
      `,
    });

    const blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDir: { value: new THREE.Vector2(1, 0) },
        uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
      },
      vertexShader: quadVs,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse;
        uniform vec2 uDir;
        uniform vec2 uTexel;
        varying vec2 vUv;
        void main() {
          vec2 stepUv = uDir * uTexel * 2.2;
          vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.227027;
          sum += texture2D(tDiffuse, vUv + stepUv * 1.0).rgb * 0.1945946;
          sum += texture2D(tDiffuse, vUv - stepUv * 1.0).rgb * 0.1945946;
          sum += texture2D(tDiffuse, vUv + stepUv * 2.0).rgb * 0.1216216;
          sum += texture2D(tDiffuse, vUv - stepUv * 2.0).rgb * 0.1216216;
          sum += texture2D(tDiffuse, vUv + stepUv * 3.0).rgb * 0.054054;
          sum += texture2D(tDiffuse, vUv - stepUv * 3.0).rgb * 0.054054;
          sum += texture2D(tDiffuse, vUv + stepUv * 4.0).rgb * 0.016216;
          sum += texture2D(tDiffuse, vUv - stepUv * 4.0).rgb * 0.016216;
          gl_FragColor = vec4(sum, 1.0);
        }
      `,
    });

    const compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: quadVs,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tScene;
        uniform sampler2D tBloom;
        uniform vec2 uMouse;
        varying vec2 vUv;
        void main() {
          // Subtle cinema chromatic aberration at extreme edges
          vec2 off = (vUv - 0.5) * 0.0022;
          vec3 crisp = vec3(
            texture2D(tScene, vUv + off).r,
            texture2D(tScene, vUv).g,
            texture2D(tScene, vUv - off).b
          );
          vec3 bloom = texture2D(tBloom, vUv).rgb;
          // Anamorphic horizontal emerald halation streak
          vec3 streak = (
            texture2D(tBloom, vUv + vec2(0.016, 0.0)).rgb +
            texture2D(tBloom, vUv - vec2(0.016, 0.0)).rgb
          ) * 0.32;

          vec3 col = crisp + bloom * 1.45 + streak * 0.55;

          // Subtle volumetric ambient emerald glow near cursor
          vec2 mUv = vec2(0.5 + uMouse.x * 0.5, 0.5 - uMouse.y * 0.5);
          float mGlow = exp(-length((vUv - mUv) * vec2(1.5, 1.0)) * 3.2);
          col += vec3(0.03, 0.16, 0.10) * mGlow;

          // ACES Filmic Tone Mapping
          col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `,
    });

    const postQuad = new THREE.Mesh(quadGeo, compositeMat);
    postScene.add(postQuad);

    let width = 900, height = 540;
    let targetMx = 0, targetMy = 0, mx = 0, my = 0;

    function resize() {
      const rect = stage.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(380, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const rw = Math.max(2, Math.round(width * dpr));
      const rh = Math.max(2, Math.round(height * dpr));
      const bw = Math.max(2, Math.round(rw * 0.5));
      const bh = Math.max(2, Math.round(rh * 0.5));
      sceneRT.setSize(rw, rh);
      bloomA.setSize(bw, bh);
      bloomB.setSize(bw, bh);
      blurMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    }
    resize();

    const onMove = (e) => {
      const rect = stage.getBoundingClientRect();
      targetMx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      targetMy = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    };
    const onLeave = () => { targetMx = 0; targetMy = 0; };
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', resize);

    restorationCleanup = () => {
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
      glyphAtlas.dispose();
      baseGeo.dispose(); rainMat.dispose();
      beamGeo.dispose(); beamMat.dispose();
      dGeo.dispose(); dMat.dispose();
      quadGeo.dispose(); threshMat.dispose(); blurMat.dispose(); compositeMat.dispose();
      sceneRT.dispose(); bloomA.dispose(); bloomB.dispose();
      renderer.dispose();
    };

    let elapsed = 0;
    function animate() {
      if (document.hidden || state.activeTab !== 'home') {
        restorationRafId = null;
        return;
      }
      elapsed += 0.016;
      mx += (targetMx - mx) * 0.055;
      my += (targetMy - my) * 0.055;

      // Sweeping 3D camera flight inside the glowing Matrix digital rain
      camera.position.x = mx * 5.2 + Math.sin(elapsed * 0.25) * 0.85;
      camera.position.y = -my * 2.8 + Math.cos(elapsed * 0.2) * 0.4;
      camera.position.z = 15.2 - Math.abs(mx) * 1.1;
      camera.lookAt(mx * 1.4, -my * 0.9, -9.0);

      rainMat.uniforms.uTime.value = reducedMotion ? 2.4 : elapsed;
      rainMat.uniforms.uCursorWorld.value.set(mx * 11.0, -my * 6.0, 0);
      beamMat.uniforms.uTime.value = elapsed;
      dust.rotation.y = elapsed * 0.025;

      // Multi-Pass GPU Bloom Render Pipeline
      renderer.setRenderTarget(sceneRT);
      renderer.clear();
      renderer.render(scene, camera);

      // Extract bright incandescent heads
      postQuad.material = threshMat;
      threshMat.uniforms.tDiffuse.value = sceneRT.texture;
      renderer.setRenderTarget(bloomA);
      renderer.render(postScene, postCam);

      // Horizontal + Vertical Dual Gaussian Blur (2 iterations for lush cinema halation)
      postQuad.material = blurMat;
      for (let pass = 0; pass < 2; pass++) {
        blurMat.uniforms.tDiffuse.value = bloomA.texture;
        blurMat.uniforms.uDir.value.set(1.35, 0);
        renderer.setRenderTarget(bloomB);
        renderer.render(postScene, postCam);

        blurMat.uniforms.tDiffuse.value = bloomB.texture;
        blurMat.uniforms.uDir.value.set(0, 1.0);
        renderer.setRenderTarget(bloomA);
        renderer.render(postScene, postCam);
      }

      // Final ACES Filmic + Anamorphic Bloom Composite to Screen
      postQuad.material = compositeMat;
      compositeMat.uniforms.tScene.value = sceneRT.texture;
      compositeMat.uniforms.tBloom.value = bloomA.texture;
      compositeMat.uniforms.uMouse.value.set(mx, my);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);

      if (!reducedMotion) restorationRafId = requestAnimationFrame(animate);
    }

    animate();
    return true;
  }

  function launchOffline3DFallback(stage, canvas, reducedMotion) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = 900, height = 540;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let mx = 0, targetMx = 0, my = 0, targetMy = 0;

    function resize() {
      const rect = stage.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(380, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const COLS = 128;
    const streams = Array.from({ length: COLS }, (_, i) => {
      const z = -20 + (i / COLS) * 26;
      const spreadX = 16 + Math.max(0, -z) * 0.95;
      return {
        x: (((i * 0.6180339) % 1) * 2 - 1) * spreadX,
        z,
        headY: ((i * 2.37) % 24) - 10,
        len: 11 + (i % 10),
        speed: 0.08 + (i % 6) * 0.024 + ((z + 20) / 26) * 0.09,
        seed: i * 17,
      };
    });
    streams.sort((a, b) => a.z - b.z);

    const onMove = (e) => {
      const rect = stage.getBoundingClientRect();
      targetMx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      targetMy = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    };
    const onLeave = () => { targetMx = 0; targetMy = 0; };
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', resize);
    restorationCleanup = () => {
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
    };

    let tick = 0;
    function draw() {
      if (document.hidden || state.activeTab !== 'home') { restorationRafId = null; return; }
      tick++;
      mx += (targetMx - mx) * 0.06;
      my += (targetMy - my) * 0.06;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#020504';
      ctx.fillRect(0, 0, width, height);

      // Soft volumetric cursor emerald aura
      const auraX = width * (0.5 + mx * 0.4);
      const auraY = height * (0.5 + my * 0.35);
      const aura = ctx.createRadialGradient(auraX, auraY, 10, auraX, auraY, width * 0.42);
      aura.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
      aura.addColorStop(0.5, 'rgba(15, 81, 50, 0.06)');
      aura.addColorStop(1, 'rgba(2, 5, 4, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';
      const fov = 480;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let si = 0; si < streams.length; si++) {
        const st = streams[si];
        if (!reducedMotion) {
          st.headY -= st.speed;
          if (st.headY < -14) st.headY = 13 + (si % 5);
        }
        const dist = 16 - st.z;
        const scale = fov / Math.max(2.0, dist);
        const px = width * 0.5 + (st.x - mx * 4.8) * scale;
        if (px < -40 || px > width + 40) continue;

        const depthNorm = Math.max(0.2, Math.min(1.0, (st.z + 20) / 26));
        const fontSize = Math.max(9, Math.min(28, Math.round(0.7 * scale)));
        const stepY = fontSize * 1.1;
        ctx.font = `700 ${fontSize}px "SF Mono", ui-monospace, Menlo, Consolas, monospace`;
        const headPy = height * 0.5 - (st.headY + my * 2.4) * scale;

        for (let k = 0; k < st.len; k++) {
          const py = headPy - k * stepY;
          if (py < -fontSize || py > height + fontSize) continue;
          const flicker = ((tick >> 2) + st.seed + k * 7) % 17 === 0 ? tick : 0;
          const ch = MATRIX_CHARS[(st.seed + k * 13 + flicker) % MATRIX_CHARS.length];
          const fade = Math.pow(1 - k / st.len, 1.45) * depthNorm;

          if (k === 0) {
            ctx.shadowColor = '#a7f3d0';
            ctx.shadowBlur = fontSize * 0.9;
            ctx.fillStyle = `rgba(240, 255, 248, ${Math.min(1, depthNorm + 0.25).toFixed(2)})`;
          } else if (k < 3) {
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = fontSize * 0.45;
            ctx.fillStyle = `rgba(34, 240, 148, ${fade.toFixed(2)})`;
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(16, 175, 104, ${(fade * 0.85).toFixed(2)})`;
          }
          ctx.fillText(ch, px, py);
        }
        ctx.shadowBlur = 0;
      }

      ctx.globalCompositeOperation = 'source-over';
      if (!reducedMotion) restorationRafId = requestAnimationFrame(draw);
    }
    draw();
  }

  function initRestorationCanvas() {
    stopRestorationCanvas();
    if (state.activeTab !== 'home') return;
    const stage = document.getElementById('hero-stage');
    let canvas = document.getElementById('restoration-canvas');
    if (!stage || !canvas) return;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (window.THREE) {
      const fresh = document.createElement('canvas');
      fresh.id = 'restoration-canvas';
      fresh.setAttribute('aria-hidden', 'true');
      canvas.replaceWith(fresh);
      const ok = launchThreeJsTheater(stage, fresh, reducedMotion);
      if (ok) return;
      canvas = fresh;
    }

    launchOffline3DFallback(stage, canvas, reducedMotion);
    const cdnTag = document.getElementById('threejs-cdn');
    if (cdnTag && !window.THREE) {
      cdnTag.addEventListener('load', () => {
        if (state.activeTab === 'home') initRestorationCanvas();
      }, { once: true });
    }
  }

  function bindDynamicInputs() {
    if (state.activeTab === 'home') initRestorationCanvas(); else stopRestorationCanvas();
    const dz = document.getElementById('dropzone');
    const fi = document.getElementById('file-input');
    if (dz) {
      dz.addEventListener('click', (e) => {
        if (!e.target.closest('button')) fi?.click();
      });
      dz.addEventListener('dragover', (e) => {
        e.preventDefault();
        dz.classList.add('dragover');
      });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', async (e) => {
        e.preventDefault();
        dz.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files || []);
        await handleIncomingFiles(files);
      });
    }
    if (fi) {
      fi.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        await handleIncomingFiles(files);
      });
    }

    const batchInput = document.getElementById('batch-file-input');
    if (batchInput) {
      batchInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        await addFilesToBatch(files);
      });
    }

    const diffInput = document.getElementById('diff-file-input');
    if (diffInput) {
      diffInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const enc = C.detectEncodingCandidates(bytes).recommended;
        const decoded = C.decodeBytes(bytes, enc);
        const dialect = C.detectDialect(decoded.text);
        const parsed = C.parseCsv(decoded.text, { delimiter: dialect.delimiter, hasHeader: true });
        state.diffTargetTable = { headers: parsed.headers, rows: parsed.rows };
        state.diffTargetName = file.name;
        state.diffResult = C.diffCsvTables(state.currentTable, state.diffTargetTable, state.diffKeyCol);
        render();
        showToast(`Compared with ${file.name}`);
      });
    }

    const searchInput = document.getElementById('grid-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.gridSearch = e.target.value;
        state.gridPage = 0;
        render();
        const nextEl = document.getElementById('grid-search-input');
        if (nextEl) {
          nextEl.focus();
          nextEl.setSelectionRange(nextEl.value.length, nextEl.value.length);
        }
      });
    }

    const sheetSel = document.getElementById('xlsx-sheet-select');
    if (sheetSel) {
      sheetSel.addEventListener('change', async (e) => {
        await loadBytesIntoWorkspace(state.fileName, state.rawBytes, { sheetName: e.target.value });
      });
    }

    const packSelect = document.getElementById('pack-select');
    if (packSelect) {
      packSelect.addEventListener('change', (e) => {
        state.selectedPackId = e.target.value;
        refreshSuggestedMappings();
        render();
      });
    }

    const expFormat = document.getElementById('export-format-select');
    if (expFormat) {
      expFormat.addEventListener('change', (e) => {
        state.exportFormat = e.target.value;
        render();
      });
    }

    const expFormula = document.getElementById('export-formula-select');
    if (expFormula) {
      expFormula.addEventListener('change', (e) => {
        state.formulaProtection = e.target.value;
      });
    }

    const vport = document.getElementById('vscroll-viewport');
    if (vport) {
      vport.scrollTop = state.vScrollTop;
      let rafPending = false;
      vport.addEventListener('scroll', () => {
        state.vScrollTop = vport.scrollTop;
        if (state.editingCell) state.editingCell = null;
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const rows = state.cachedFilteredRows || [];
          const activeTable = state.gridShowOriginal ? state.originalTable : state.currentTable;
          const cellMap = state.gridShowOriginal ? {} : state.diagnostics.cellIssuesMap;
          const rowH = state.vRowHeight;
          const overscan = 10;
          const startIdx = Math.max(0, Math.floor(state.vScrollTop / rowH) - overscan);
          const visibleCount = Math.ceil(vport.clientHeight / rowH) + overscan * 2;
          const endIdx = Math.min(rows.length, startIdx + visibleCount);
          const topSpacer = startIdx * rowH;
          const bottomSpacer = Math.max(0, (rows.length - endIdx) * rowH);
          const tbody = document.getElementById('vscroll-tbody');
          const status = document.getElementById('vscroll-status');
          if (status) status.textContent = `Virtual Scroll: ${rows.length.toLocaleString()} rows (${startIdx + 1}–${endIdx})`;
          if (tbody && activeTable) {
            const cols = activeTable.headers.length;
            let html = topSpacer > 0 ? `<tr style="height:${topSpacer}px;"><td colspan="${cols + 1}" style="padding:0;border:none;"></td></tr>` : '';
            for (let i = startIdx; i < endIdx; i++) {
              const r = rows[i];
              html += `<tr class="vrow"><td class="row-num">${r.rowNumber}</td>`;
              for (let c = 0; c < cols; c++) {
                const cellVal = r.cells[c] ?? '';
                const iss = cellMap[`${r.id}:${c}`];
                const cls = iss ? `cell-${iss.severity}` : '';
                html += `<td class="${cls}" title="${esc(iss ? iss.message : cellVal)}" data-action="select-cell" data-row-id="${esc(r.id)}" data-col-idx="${c}">${esc(cellVal)}</td>`;
              }
              html += '</tr>';
            }
            if (bottomSpacer > 0) html += `<tr style="height:${bottomSpacer}px;"><td colspan="${cols + 1}" style="padding:0;border:none;"></td></tr>`;
            tbody.innerHTML = html;
          }
        });
      });
    }

    const inlineEd = document.getElementById('inline-cell-editor');
    if (inlineEd) {
      inlineEd.focus();
      inlineEd.select();
      const commitInline = () => {
        if (!state.editingCell) return;
        const rowId = inlineEd.dataset.rowId;
        const colIdx = Number(inlineEd.dataset.colIdx);
        const newVal = inlineEd.value;
        state.editingCell = null;
        const rowObj = state.currentTable?.rows.find((r) => r.id === rowId);
        if (rowObj && (rowObj.cells[colIdx] ?? '') !== newVal) {
          const nextCells = rowObj.cells.slice();
          while (nextCells.length <= colIdx) nextCells.push('');
          nextCells[colIdx] = newVal;
          pushHistoryAndApply({ ruleId: 'update_row_cells', params: { rowId, cells: nextCells } }, 'confirmed');
        } else {
          render();
        }
      };
      inlineEd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commitInline(); }
        else if (e.key === 'Escape') { e.preventDefault(); state.editingCell = null; render(); }
      });
      inlineEd.addEventListener('blur', commitInline);
    }

    // Drag-to-Reorder column headers
    document.querySelectorAll('th.col-draggable').forEach((th) => {
      th.addEventListener('dragstart', (e) => {
        state.dragColIdx = Number(th.dataset.colIdx);
        e.dataTransfer.effectAllowed = 'move';
      });
      th.addEventListener('dragover', (e) => {
        if (state.dragColIdx === null) return;
        e.preventDefault();
        th.classList.add('drag-over');
      });
      th.addEventListener('dragleave', () => th.classList.remove('drag-over'));
      th.addEventListener('drop', (e) => {
        th.classList.remove('drag-over');
        if (state.dragColIdx === null) return;
        e.preventDefault();
        e.stopPropagation();
        const fromIdx = state.dragColIdx;
        const toIdx = Number(th.dataset.colIdx);
        state.dragColIdx = null;
        if (fromIdx === toIdx || !state.currentTable) return;
        const order = state.currentTable.headers.map((_, i) => i);
        const [moved] = order.splice(fromIdx, 1);
        order.splice(toIdx, 0, moved);
        state.sortCol = -1;
        state.sortDir = null;
        pushHistoryAndApply({ ruleId: 'reorder_columns', params: { order } }, 'confirmed');
      });
      th.addEventListener('dragend', () => {
        state.dragColIdx = null;
        document.querySelectorAll('th.drag-over').forEach((el) => el.classList.remove('drag-over'));
      });
    });

    const diffKeySel = document.getElementById('diff-key-select');
    if (diffKeySel) {
      diffKeySel.addEventListener('change', (e) => {
        state.diffKeyCol = Number(e.target.value);
        if (state.diffTargetTable) {
          state.diffResult = C.diffCsvTables(state.currentTable, state.diffTargetTable, state.diffKeyCol);
          render();
        }
      });
    }
  }

  async function handleIncomingFiles(files) {
    if (!files || files.length === 0) return;
    if (files.length === 1) {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      await loadBytesIntoWorkspace(files[0].name, bytes);
    } else {
      await addFilesToBatch(files);
      state.activeTab = 'batch';
      render();
    }
  }

  async function addFilesToBatch(files) {
    for (const f of files) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const enc = C.detectEncodingCandidates(bytes).recommended;
      const decoded = C.decodeBytes(bytes, enc);
      const dialect = C.detectDialect(decoded.text);
      const parsed = C.parseCsv(decoded.text, { delimiter: dialect.delimiter, hasHeader: true });
      state.batchFiles.push({
        fileName: f.name,
        headers: parsed.headers,
        rows: parsed.rows,
      });
    }
    render();
    showToast(`Added ${files.length} file(s) to batch`);
  }

  async function computeExportAndReceipt() {
    const customDelim = document.getElementById('export-custom-delim')?.value || state.customDelimiter;
    state.customDelimiter = customDelim;

    const exported = await C.buildSafeExport(state.currentTable, {
      format: state.exportFormat,
      customDelimiter: state.customDelimiter,
      formulaProtection: state.formulaProtection,
    });
    state.lastExportMeta = exported;

    const ledger = C.buildIntegrityLedger({
      originalRowCount: state.originalTable.rows.length,
      currentRowCount: state.currentTable.rows.length,
      originalColCount: state.originalTable.headers.length,
      currentColCount: state.currentTable.headers.length,
      originalBytesLength: state.rawBytes ? state.rawBytes.length : 0,
      outputBytesLength: exported.byteLength,
      appliedRules: state.appliedRules,
      unresolvedCount: state.uncertaintyItems.filter((u) => u.status === 'pending').length,
      autoFixedCount: state.autoFixedCount,
      userConfirmedCount: state.userConfirmedCount,
      keptOriginalCount: state.keptOriginalCount,
      encoding: state.selectedEncoding,
      delimiter: state.selectedDelimiter,
      inputHash: state.inputHash,
      outputHash: exported.outputHash,
    });

    const receipt = C.generateRepairReceipt({
      fileName: state.fileName,
      inputHash: state.inputHash,
      outputHash: exported.outputHash,
      encoding: state.selectedEncoding,
      delimiter: state.selectedDelimiter === '\t' ? 'TAB' : state.selectedDelimiter,
      exportFormat: state.exportFormat,
      formulaProtectionMode: state.formulaProtection,
      formulaProtectedCount: exported.formulaProtectedCount,
      ledger,
      appliedRules: state.appliedRules,
      unresolvedItems: state.uncertaintyItems.filter((u) => u.status === 'pending'),
    });

    return { exported, receipt };
  }

  // ============================================================================
  // Global Event Delegation (Zero Dead Buttons)
  // ============================================================================
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'close-modal' || (action === 'close-modal-backdrop' && e.target === target)) {
      closeModal();
      return;
    }

    if (action === 'select-hero-tab') {
      state.heroShowcaseTab = target.dataset.heroTab;
      render();
      return;
    }

    if (action === 'toggle-lang') {
      state.lang = state.lang === 'zh' ? 'en' : 'zh';
      render();
      return;
    }

    if (action === 'nav') {
      const tab = target.dataset.tab;
      if (tab) {
        state.activeTab = tab;
        render();
      }
      return;
    }

    if (action === 'trigger-file-input') {
      document.getElementById('file-input')?.click();
      return;
    }

    if (action === 'load-sample') {
      const sample = SAMPLES[target.dataset.sample];
      if (sample) {
        await loadBytesIntoWorkspace(sample.name, C.encodeUtf8(sample.content));
      }
      return;
    }

    if (action === 'cancel-job') {
      cancelActiveJob();
      return;
    }

    if (action === 'load-stress-100k') {
      const count = 100000;
      const lines = new Array(count + 1);
      lines[0] = 'order_id,customer_name,email,phone,address,zip_code,order_date,amount,notes';
      for (let i = 1; i <= count; i++) {
        if (i % 500 === 0) {
          lines[i] = `ORD-${i},Customer ${i},USER${i}@EXAMPLE.US,415-555-0198,742 Evergreen Ave, Boston MA,02138,04/03/2026,$99.00,Unquoted comma`;
        } else if (i % 2000 === 0) {
          lines[i] = `ORD-${i},Customer ${i},user${i}@example.us,212-555-0142,"New York NY",10118,2026-03-04,$50.00,=HYPERLINK("http://example.com")`;
        } else if (i % 50 === 0) {
          lines[i] = `ORD-${i},Customer ${i},USER${i}@EXAMPLE.US,617-555-0188,"Hoboken NJ",07030,2026-03-04,$120.00,OK`;
        } else {
          lines[i] = `ORD-${i},Customer ${i},user${i}@example.us,206-555-0123,"Seattle WA",98109,2026-03-04,$120.00,OK`;
        }
      }
      const bytes = C.encodeUtf8(lines.join('\r\n') + '\r\n');
      await loadBytesIntoWorkspace('stress_test_100k_rows.csv', bytes);
      return;
    }

    if (action === 'undo') {
      undoLast();
      return;
    }

    if (action === 'redo') {
      redoLast();
      return;
    }

    if (action === 'reset-original') {
      await loadBytesIntoWorkspace(state.fileName, state.rawBytes, {
        encoding: state.selectedEncoding,
        delimiter: state.selectedDelimiter,
        hasHeader: state.hasHeader,
      });
      showToast(state.lang === 'zh' ? '已还原至原始文件状态' : 'Reset to original file');
      return;
    }

    if (action === 'set-health-cat') {
      state.healthCategory = target.dataset.cat;
      render();
      return;
    }

    if (action === 'jump-errors-grid') {
      state.gridErrorsOnly = true;
      state.gridShowOriginal = false;
      state.activeTab = 'grid';
      render();
      return;
    }

    if (action === 'preview-encoding') {
      state.previewEncoding = target.dataset.enc;
      render();
      return;
    }

    if (action === 'select-encoding') {
      state.selectedEncoding = target.dataset.enc;
      state.previewEncoding = target.dataset.enc;
      await loadBytesIntoWorkspace(state.fileName, state.rawBytes, {
        encoding: state.selectedEncoding,
        delimiter: state.selectedDelimiter,
        hasHeader: state.hasHeader,
      });
      return;
    }

    if (action === 'apply-dialect') {
      const delimSel = document.getElementById('dialect-delim-select');
      const headerSel = document.getElementById('dialect-header-select');
      if (delimSel) state.selectedDelimiter = delimSel.value;
      if (headerSel) state.hasHeader = headerSel.value === 'true';
      await loadBytesIntoWorkspace(state.fileName, state.rawBytes, {
        encoding: state.selectedEncoding,
        delimiter: state.selectedDelimiter,
        hasHeader: state.hasHeader,
      });
      return;
    }

    if (action === 'apply-safe-fixes') {
      const safeRules = ['remove_blank_rows', 'remove_repeated_headers', 'trim_whitespace'];
      let applied = 0;
      for (const rId of safeRules) {
        const test = C.executeRule(state.currentTable, { ruleId: rId });
        if (test.affectedRows > 0) {
          pushHistoryAndApply({ ruleId: rId }, 'auto');
          applied++;
        }
      }
      if (applied === 0) {
        showToast(state.lang === 'zh' ? '当前没有可自动执行的安全修复项' : 'No safe automatic fixes remaining');
      }
      return;
    }

    if (action === 'preview-rule') {
      const iss = state.diagnostics.issues.find((i) => i.id === target.dataset.issueId);
      const act = iss?.suggestedActions?.[Number(target.dataset.actIdx)];
      if (!act) return;
      const preview = C.executeRule(state.currentTable, { ruleId: act.ruleId, params: act.params });
      const rowsHtml =
        preview.samples.length === 0
          ? '<p>No rows would change.</p>'
          : `<table class="data-table"><thead><tr><th>Row</th><th>Before</th><th>After</th></tr></thead><tbody>${preview.samples
              .map(
                (s) =>
                  `<tr><td>${s.rowNumber}</td><td style="white-space:normal;">${esc(s.before)}</td><td style="white-space:normal;color:#059669;">${esc(s.after)}</td></tr>`
              )
              .join('')}</tbody></table>`;
      openModal(
        `Preview: ${act.label}`,
        `<p style="font-size:13px;color:#475569;margin-top:0;">Affected rows: <strong>${preview.affectedRows}</strong> · Cells modified: <strong>${preview.affectedCells}</strong> · Rows removed: <strong>${preview.removedRows}</strong></p>${rowsHtml}`,
        `<button class="btn" data-action="close-modal">Close</button>
         <button class="btn btn-primary" data-action="confirm-modal-rule" data-issue-id="${esc(iss.id)}" data-act-idx="${target.dataset.actIdx}">Apply This Fix</button>`
      );
      return;
    }

    if (action === 'apply-issue-action' || action === 'confirm-modal-rule') {
      const iss = state.diagnostics.issues.find((i) => i.id === target.dataset.issueId);
      const act = iss?.suggestedActions?.[Number(target.dataset.actIdx)];
      if (!act) return;
      closeModal();
      pushHistoryAndApply({ ruleId: act.ruleId, params: act.params }, 'confirmed');
      return;
    }

    if (action === 'skip-issue') {
      state.skippedIssueIds.add(target.dataset.issueId);
      render();
      return;
    }

    if (action === 'fill-nl-sample') {
      state.nlPrompt =
        state.lang === 'zh'
          ? '删除空白行，去除多余空格，把邮箱统一成小写，保留最新订单，电话号码统一加国家代码，最后导出 Excel 可以打开的 CSV'
          : 'Remove blank rows, trim spaces, lowercase email, keep latest order, normalize US phone numbers, export Excel CSV with BOM';
      state.nlPlan = C.parseHumanFixLanguage(state.nlPrompt, state.currentTable.headers);
      render();
      return;
    }

    if (action === 'parse-nl') {
      const inp = document.getElementById('nl-input');
      state.nlPrompt = inp ? inp.value : state.nlPrompt;
      state.nlPlan = C.parseHumanFixLanguage(state.nlPrompt, state.currentTable.headers);
      render();
      return;
    }

    if (action === 'apply-nl-plan') {
      if (!state.nlPlan) return;
      for (const step of state.nlPlan.steps) {
        pushHistoryAndApply({ ruleId: step.ruleId, params: step.params }, 'confirmed');
      }
      if (state.nlPlan.exportHints?.format) {
        state.exportFormat = state.nlPlan.exportHints.format;
      }
      state.nlPlan = null;
      render();
      showToast(state.lang === 'zh' ? '清洗计划已全部执行' : 'Cleaning plan applied');
      return;
    }

    // Data Grid & Column Tools
    if (action === 'toggle-grid-errors') {
      state.gridErrorsOnly = !state.gridErrorsOnly;
      state.gridPage = 0;
      render();
      return;
    }

    if (action === 'toggle-grid-original') {
      state.gridShowOriginal = !state.gridShowOriginal;
      render();
      return;
    }

    if (action === 'toggle-col-tools') {
      state.showColumnTools = !state.showColumnTools;
      render();
      return;
    }

    if (action === 'grid-prev') {
      state.gridPage = Math.max(0, state.gridPage - 1);
      render();
      return;
    }

    if (action === 'grid-next') {
      state.gridPage += 1;
      render();
      return;
    }

    if (action === 'select-cell') {
      state.selectedCell = {
        rowId: target.dataset.rowId,
        colIdx: Number(target.dataset.colIdx),
      };
      render();
      return;
    }

    if (action === 'save-cell-edit') {
      const rowId = target.dataset.rowId;
      const colIdx = Number(target.dataset.colIdx);
      const val = document.getElementById('inspector-cell-input')?.value ?? '';
      const rowObj = state.currentTable.rows.find((r) => r.id === rowId);
      if (rowObj) {
        const nextCells = [...rowObj.cells];
        while (nextCells.length <= colIdx) nextCells.push('');
        nextCells[colIdx] = val;
        pushHistoryAndApply({ ruleId: 'update_row_cells', params: { rowId, cells: nextCells } }, 'confirmed');
      }
      return;
    }

    if (action === 'tool-rename') {
      const col = Number(document.getElementById('tool-rename-col')?.value ?? 0);
      const newName = document.getElementById('tool-rename-val')?.value?.trim();
      if (newName) pushHistoryAndApply({ ruleId: 'rename_column', params: { column: col, newName } });
      return;
    }

    if (action === 'tool-split') {
      const col = Number(document.getElementById('tool-split-col')?.value ?? 0);
      const sep = document.getElementById('tool-split-sep')?.value ?? ' ';
      pushHistoryAndApply({ ruleId: 'split_column', params: { column: col, separator: sep } });
      return;
    }

    if (action === 'tool-merge') {
      const colA = Number(document.getElementById('tool-merge-a')?.value ?? 0);
      const colB = Number(document.getElementById('tool-merge-b')?.value ?? 1);
      if (colA === colB) {
        showToast('Please select two different columns to merge');
        return;
      }
      pushHistoryAndApply({ ruleId: 'merge_columns', params: { columnA: colA, columnB: colB, separator: ' ' } });
      return;
    }

    if (action === 'tool-dedupe-key') {
      const col = Number(document.getElementById('tool-dedupe-col')?.value ?? 0);
      const keep = document.getElementById('tool-dedupe-keep')?.value || 'first';
      pushHistoryAndApply({ ruleId: 'deduplicate_by_key', params: { column: col, keep } });
      return;
    }

    if (action === 'quick-rule') {
      pushHistoryAndApply({ ruleId: target.dataset.rule });
      return;
    }

    // Mapping Studio & Supplier Memory
    if (action === 'save-template') {
      const name = document.getElementById('template-name-input')?.value?.trim() || `${state.fileName} Template`;
      const mappingObj = {};
      for (const m of state.mappings) {
        if (m.targetField) mappingObj[m.sourceColumn] = m.targetField;
      }
      const existingIdx = state.templates.findIndex((x) => x.name === name);
      const nextVersion = existingIdx >= 0 ? state.templates[existingIdx].version + 1 : 1;
      const tpl = {
        name,
        version: nextVersion,
        packId: state.selectedPackId,
        sourceHeaders: [...state.currentTable.headers],
        mapping: mappingObj,
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) state.templates[existingIdx] = tpl;
      else state.templates.push(tpl);
      state.activeTemplateName = name;
      persistTemplates();
      state.schemaDrift = C.detectSchemaDrift(state.currentTable.headers, tpl);
      render();
      showToast(`Saved Supplier Template "${name}" (v${nextVersion})`);
      return;
    }

    if (action === 'load-template') {
      const selName = document.getElementById('saved-template-select')?.value;
      const tpl = state.templates.find((x) => x.name === selName);
      if (!tpl) return;
      state.activeTemplateName = tpl.name;
      state.selectedPackId = tpl.packId || state.selectedPackId;
      refreshSuggestedMappings(tpl);
      render();
      showToast(`Loaded template "${tpl.name}" (v${tpl.version})`);
      return;
    }

    if (action === 'export-templates') {
      triggerDownload(
        JSON.stringify(state.templates, null, 2),
        'application/json',
        'csv-rescue-supplier-templates.json'
      );
      showToast('Exported Supplier Memory templates JSON');
      return;
    }

    if (action === 'apply-mapping') {
      const keepChk = document.getElementById('keep-unmapped-chk');
      state.keepUnmapped = keepChk ? keepChk.checked : true;
      state.undoStack.push({
        ruleObj: null,
        inversePatch: { type: 'full_snapshot', table: C.deepClone(state.currentTable) },
        dirtyColumns: null,
        appliedRulesLen: state.appliedRules.length,
      });
      state.redoStack = [];
      state.currentTable = C.applyColumnMapping(state.currentTable, state.mappings, state.keepUnmapped);
      state.appliedRules.push({
        ruleId: 'apply_column_mapping',
        description: `Applied Business Pack mapping (${state.selectedPackId})`,
        affectedRows: state.currentTable.rows.length,
        affectedCells: state.currentTable.rows.length * state.currentTable.headers.length,
        removedRows: 0,
      });
      recomputeDiagnostics();
      refreshSuggestedMappings();
      render();
      showToast('Column mapping applied');
      return;
    }

    // Uncertainty Queue
    if (action === 'uq-accept') {
      const u = state.uncertaintyItems.find((x) => x.id === target.dataset.uqId);
      if (!u || !u.candidateFix) return;
      u.status = 'accepted';
      pushHistoryAndApply(
        { ruleId: 'update_row_cells', params: { rowId: u.rowId, cells: u.candidateFix.proposedCells } },
        'confirmed'
      );
      return;
    }

    if (action === 'uq-edit') {
      const u = state.uncertaintyItems.find((x) => x.id === target.dataset.uqId);
      if (!u) return;
      const expectedCols = state.currentTable.headers.length;
      const fieldsHtml = Array.from({ length: Math.max(expectedCols, u.originalCells.length) }, (_, idx) => {
        const label = state.currentTable.headers[idx] || `extra_field_${idx + 1}`;
        return `
          <div class="form-field" style="margin-bottom:8px;">
            <label>${esc(label)}</label>
            <input class="input uq-edit-field" data-idx="${idx}" value="${esc(u.originalCells[idx] ?? '')}" />
          </div>
        `;
      }).join('');
      openModal(
        `Manual Edit — Row ${u.rowNumber}`,
        `<p style="font-size:12.5px;color:#64748b;margin-top:0;">${esc(u.reason)}</p>${fieldsHtml}`,
        `<button class="btn" data-action="close-modal">Cancel</button>
         <button class="btn btn-primary" data-action="uq-save-manual" data-uq-id="${esc(u.id)}">Save Row</button>`
      );
      return;
    }

    if (action === 'uq-save-manual') {
      const u = state.uncertaintyItems.find((x) => x.id === target.dataset.uqId);
      if (!u) return;
      const inputs = Array.from(document.querySelectorAll('.uq-edit-field'));
      const cells = inputs.slice(0, state.currentTable.headers.length).map((i) => i.value);
      u.status = 'edited';
      closeModal();
      pushHistoryAndApply({ ruleId: 'update_row_cells', params: { rowId: u.rowId, cells } }, 'confirmed');
      return;
    }

    if (action === 'uq-keep') {
      const u = state.uncertaintyItems.find((x) => x.id === target.dataset.uqId);
      if (u) {
        u.status = 'kept';
        state.keptOriginalCount++;
        render();
        showToast(`Kept row ${u.rowNumber} as original`);
      }
      return;
    }

    if (action === 'uq-exclude') {
      const u = state.uncertaintyItems.find((x) => x.id === target.dataset.uqId);
      if (u) {
        u.status = 'excluded';
        pushHistoryAndApply({ ruleId: 'exclude_row', params: { rowId: u.rowId } }, 'confirmed');
      }
      return;
    }

    if (action === 'export-unresolved') {
      const pending = state.uncertaintyItems.filter((u) => u.status === 'pending');
      const csv = C.serializeCsv(
        ['row_number', 'source_line', 'issue_code', 'reason', 'raw_line'],
        pending.map((u) => [String(u.rowNumber), String(u.sourceLine), u.issueCode, u.reason, u.raw])
      );
      triggerDownload(csv, 'text/csv;charset=utf-8', `unresolved_${state.fileName || 'rows.csv'}`);
      showToast(`Exported ${pending.length} unresolved rows`);
      return;
    }

    // Batch & Diff
    if (action === 'trigger-batch-input') {
      document.getElementById('batch-file-input')?.click();
      return;
    }

    if (action === 'load-batch-demo') {
      state.batchFiles = BATCH_DEMO_FILES.map((f) => {
        const parsed = C.parseCsv(f.content, { delimiter: ',', hasHeader: true });
        return { fileName: f.name, headers: parsed.headers, rows: parsed.rows };
      });
      render();
      showToast('Loaded 2-supplier demo batch');
      return;
    }

    if (action === 'clear-batch') {
      state.batchFiles = [];
      render();
      return;
    }

    if (action === 'merge-batch') {
      const dedupeKey = document.getElementById('batch-dedupe-select')?.value || '';
      const incSrc = document.getElementById('batch-source-chk')?.checked ?? true;
      state.batchDedupeKey = dedupeKey;
      state.batchIncludeSource = incSrc;
      const merged = C.mergeBatchFiles(state.batchFiles, {
        dedupeKey,
        includeSourceColumn: incSrc,
      });
      const csvStr = C.serializeCsv(
        merged.headers,
        merged.rows.map((r) => r.cells)
      );
      await loadBytesIntoWorkspace(
        `merged_${state.batchFiles.length}_files.csv`,
        C.encodeUtf8(csvStr)
      );
      showToast(
        `Merged ${state.batchFiles.length} files (${merged.rows.length} rows, ${merged.crossFileDuplicatesRemoved} cross-file duplicates removed)`
      );
      return;
    }

    if (action === 'diff-original-vs-clean') {
      state.diffTargetTable = state.currentTable;
      state.diffTargetName = 'Current Cleaned';
      state.diffResult = C.diffCsvTables(state.originalTable, state.currentTable, state.diffKeyCol);
      render();
      return;
    }

    if (action === 'trigger-diff-input') {
      document.getElementById('diff-file-input')?.click();
      return;
    }

    // Safe Export & Receipt
    if (action === 'do-export') {
      const { exported } = await computeExportAndReceipt();
      const base = (state.fileName || 'cleaned').replace(/\.[^.]+$/, '');
      triggerDownload(exported.bytes, exported.mimeType, `${base}_rescued.${exported.extension}`);
      launchMicroConfetti(target);
      render();
      showToast(`Exported ${base}_rescued.${exported.extension}`);
      return;
    }

    if (action === 'download-receipt-html') {
      const { receipt } = await computeExportAndReceipt();
      const base = (state.fileName || 'cleaned').replace(/\.[^.]+$/, '');
      triggerDownload(receipt.html, 'text/html;charset=utf-8', `${base}_rescue_receipt.html`);
      render();
      showToast('Downloaded HTML Repair Receipt');
      return;
    }

    if (action === 'download-receipt-json') {
      const { receipt } = await computeExportAndReceipt();
      const base = (state.fileName || 'cleaned').replace(/\.[^.]+$/, '');
      triggerDownload(
        JSON.stringify(receipt.json, null, 2),
        'application/json;charset=utf-8',
        `${base}_rescue_receipt.json`
      );
      render();
      showToast('Downloaded JSON Repair Receipt');
      return;
    }

    if (action === 'preview-receipt') {
      const { receipt } = await computeExportAndReceipt();
      render();
      openModal(
        'CSV Rescue Receipt Preview (Privacy-Safe)',
        `<pre class="preview-pre" style="max-height:420px;">${esc(JSON.stringify(receipt.json, null, 2))}</pre>`,
        `<button class="btn" data-action="close-modal">Close</button>`
      );
      return;
    }
  });

  // Handle dropdown change for mapping rows
  document.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-action="change-mapping"]');
    if (!sel) return;
    const idx = Number(sel.dataset.idx);
    if (state.mappings[idx]) {
      state.mappings[idx].targetField = sel.value;
      state.mappings[idx].matchType = 'manual';
      state.mappings[idx].reason = sel.value ? 'Selected manually by user' : 'Kept original column';
      render();
    }
  });

  // ============================================================================
  // v2.3 UX Upgrades: Command Palette (Ctrl+K), Column Quick Menu, Double-Click
  // Inline Edit, Global File Drag-and-Drop Overlay & Keyboard Shortcuts
  // ============================================================================
  function getCommandCatalog() {
    const hasFile = Boolean(state.currentTable);
    const zh = state.lang === 'zh';
    return [
      { id: 'cmd_health', title: zh ? '① 查看 CSV 健康检查报告' : '1. View CSV Health Report', keywords: 'health report issues diagnose 诊断 报告 问题', enabled: hasFile, run: () => { state.activeTab = 'health'; render(); } },
      { id: 'cmd_encoding', title: zh ? '修复乱码 / 编码侦探 (UTF-8 / GB18030 / Big5 / Win1252)' : 'Fix Mojibake / Encoding Detective', keywords: 'encoding bom mojibake utf8 gbk 乱码 编码 分隔符', enabled: hasFile, run: () => { state.activeTab = 'encoding'; render(); } },
      { id: 'cmd_review', title: zh ? '② 修复证据审核与人话清洗指令' : '2. Review Fixes & Human Fix Language', keywords: 'fix repair evidence nl natural language 修复 审核 人话 清洗', enabled: hasFile, run: () => { state.activeTab = 'review'; render(); } },
      { id: 'cmd_safe_fixes', title: zh ? '一键应用所有安全修复 (去空行/去空格/去重复表头)' : 'Apply All Safe Fixes (Blanks / Trim / Repeated Headers)', keywords: 'safe trim blank whitespace 空行 空格 安全修复', enabled: hasFile, run: () => { const safeRules = ['remove_blank_rows', 'remove_repeated_headers', 'trim_whitespace']; let n = 0; for (const rId of safeRules) { if (C.executeRule(state.currentTable, { ruleId: rId }).affectedRows > 0) { pushHistoryAndApply({ ruleId: rId }, 'auto'); n++; } } if (n === 0) showToast(state.lang === 'zh' ? '当前没有可自动执行的安全修复项' : 'No safe fixes remaining'); } },
      { id: 'cmd_grid', title: zh ? '③ 打开数据表格 (拖拽换列 / 排序 / 双击编辑)' : '3. Open Data Grid (Drag Reorder / Sort / Inline Edit)', keywords: 'grid table edit sort filter 表格 排序 编辑 筛选', enabled: hasFile, run: () => { state.activeTab = 'grid'; render(); } },
      { id: 'cmd_col_tools', title: zh ? '打开列工具 (重命名 / 拆分列 / 合并列 / 按主键去重)' : 'Open Column Tools (Rename / Split / Merge / Dedupe by Key)', keywords: 'split merge rename dedupe duplicate column 拆分 合并 重命名 去重', enabled: hasFile, run: () => { state.activeTab = 'grid'; state.showColumnTools = true; render(); } },
      { id: 'cmd_mapping', title: zh ? '字段映射工作室与供应商记忆 (Supplier Memory)' : 'Column Mapping Studio & Supplier Memory', keywords: 'map mapping supplier template schema drift 映射 供应商 模板', enabled: hasFile, run: () => { state.activeTab = 'mapping'; render(); } },
      { id: 'cmd_uq', title: zh ? '不确定数据隔离区 (坏行与异常人工确认)' : 'Uncertainty Queue (Quarantined Broken Rows)', keywords: 'uncertainty quarantine broken rows 隔离区 坏行 异常', enabled: hasFile, run: () => { state.activeTab = 'uncertainty'; render(); } },
      { id: 'cmd_batch', title: zh ? '多文件批量合并与 CSV 差异对比 (Batch & Diff)' : 'Multi-File Batch Merge & CSV Diff', keywords: 'batch merge compare diff 批量 合并 对比 差异', enabled: true, run: () => { state.activeTab = 'batch'; render(); } },
      { id: 'cmd_export', title: zh ? '④ 安全导出 (Excel BOM / 公式防护 / 修复收据)' : '4. Safe Export (Excel BOM / OWASP Formula Guard / Receipt)', keywords: 'export download excel json tsv formula receipt 导出 收据 公式', enabled: hasFile, run: () => { state.activeTab = 'export'; render(); } },
      { id: 'cmd_sample_broken', title: zh ? '载入演示样本：损坏订单表' : 'Load Demo: Broken Orders CSV', keywords: 'sample demo broken 样本 演示', enabled: true, run: () => loadBytesIntoWorkspace(SAMPLES.broken.name, C.encodeUtf8(SAMPLES.broken.content)) },
      { id: 'cmd_sample_100k', title: zh ? '载入 100,000 行压力测试样本' : 'Load 100,000-Row Stress Test Sample', keywords: '100k stress benchmark 压测 十万行', enabled: true, run: () => { state.activeTab = 'home'; render(); setTimeout(() => document.querySelector('[data-action="load-stress-100k"]')?.click(), 30); } },
    ];
  }

  function renderCmdPalette() {
    const q = state.cmdQuery.trim().toLowerCase();
    const items = getCommandCatalog().filter((it) => !q || it.title.toLowerCase().includes(q) || it.keywords.toLowerCase().includes(q));
    const listHtml = items.length === 0
      ? `<div style="padding:16px;text-align:center;color:#64748b;">No matching features</div>`
      : items.map((it) => `
          <button class="cmd-item" data-action="run-cmd" data-cmd-id="${esc(it.id)}" ${it.enabled ? '' : 'disabled style="opacity:0.45;cursor:not-allowed;"'}>
            <span style="font-weight:600;font-size:13px;">${esc(it.title)}</span>
            <span style="font-size:11px;color:#64748b;">${it.enabled ? '↵' : (state.lang === 'zh' ? '需先载入文件' : 'Load file first')}</span>
          </button>
        `).join('');
    openModal(
      state.lang === 'zh' ? '快捷功能搜索 (Ctrl+K)' : 'Quick Feature Finder (Ctrl+K)',
      `<input class="input" id="cmd-palette-input" placeholder="${state.lang === 'zh' ? '输入关键词：去重、乱码、日期、电话、拆分、合并、导出...' : 'Type to search: dedupe, encoding, date, phone, split, merge, export...'}" value="${esc(state.cmdQuery)}" />
       <div class="cmd-list">${listHtml}</div>`
    );
    const inp = document.getElementById('cmd-palette-input');
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
      inp.addEventListener('input', (e) => {
        state.cmdQuery = e.target.value;
        renderCmdPalette();
      });
    }
  }

  function openColumnQuickMenu(colIdx) {
    const colName = state.currentTable?.headers?.[colIdx];
    if (colName === undefined) return;
    const zh = state.lang === 'zh';
    openModal(
      `${zh ? '列快捷操作' : 'Column Quick Actions'}: "${colName}"`,
      `
        <div class="form-row">
          <div class="form-field">
            <label>${zh ? '快速重命名此列' : 'Quick Rename Column'}</label>
            <input class="input" id="col-menu-rename-inp" value="${esc(colName)}" />
          </div>
          <button class="btn btn-primary btn-sm" data-action="col-menu-rename" data-col-idx="${colIdx}">${zh ? '重命名' : 'Rename'}</button>
        </div>
        <div style="font-size:12px;font-weight:600;color:#475569;margin:10px 0 6px;">${zh ? '一键清洗此列：' : 'One-Click Column Cleaning:'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="lowercase_column">lowercase</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="uppercase_column">UPPERCASE</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="titlecase_column">Title Case</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="normalize_dates" data-extra='{"preference":"DMY"}'>${zh ? '日期 DMY → YYYY-MM-DD' : 'Date DMY → ISO'}</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="normalize_dates" data-extra='{"preference":"MDY"}'>${zh ? '日期 MDY → YYYY-MM-DD' : 'Date MDY → ISO'}</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="normalize_phone" data-extra='{"region":"US","preserveOriginal":true}'>${zh ? '电话 US (+1)' : 'Phone US (+1)'}</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="normalize_phone" data-extra='{"region":"MY","preserveOriginal":true}'>${zh ? '电话 MY (+60)' : 'Phone MY (+60)'}</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="normalize_phone" data-extra='{"region":"SG","preserveOriginal":true}'>${zh ? '电话 SG (+65)' : 'Phone SG (+65)'}</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="normalize_phone" data-extra='{"region":"CN","preserveOriginal":true}'>${zh ? '电话 CN (+86)' : 'Phone CN (+86)'}</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="normalize_currency">${zh ? '标准化金额' : 'Normalize Currency'}</button>
          <button class="btn btn-sm" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="preserve_leading_zeros" data-extra='{"minLength":5}'>${zh ? '保留前导零 (5位)' : 'Preserve Leading Zeros'}</button>
          <button class="btn btn-sm btn-primary" data-action="col-menu-rule" data-col-idx="${colIdx}" data-rule="deduplicate_by_key" data-extra='{"keep":"first"}'>${zh ? '按此列主键去重' : 'Dedupe by This Column'}</button>
        </div>
      `,
      `<button class="btn" data-action="close-modal">${zh ? '关闭' : 'Close'}</button>`
    );
  }

  // Click delegation for v2.3 actions
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'open-cmd-palette') {
      state.cmdQuery = '';
      renderCmdPalette();
      return;
    }
    if (action === 'run-cmd') {
      const cmd = getCommandCatalog().find((c) => c.id === target.dataset.cmdId);
      closeModal();
      if (cmd && cmd.enabled) cmd.run();
      return;
    }
    if (action === 'sort-col') {
      const col = Number(target.dataset.colIdx);
      if (state.sortCol !== col) {
        state.sortCol = col;
        state.sortDir = 'asc';
      } else if (state.sortDir === 'asc') {
        state.sortDir = 'desc';
      } else {
        state.sortCol = -1;
        state.sortDir = null;
      }
      state.vScrollTop = 0;
      render();
      return;
    }
    if (action === 'open-col-menu') {
      openColumnQuickMenu(Number(target.dataset.colIdx));
      return;
    }
    if (action === 'col-menu-rename') {
      const col = Number(target.dataset.colIdx);
      const val = document.getElementById('col-menu-rename-inp')?.value?.trim();
      closeModal();
      if (val) pushHistoryAndApply({ ruleId: 'rename_column', params: { column: col, newName: val } }, 'confirmed');
      return;
    }
    if (action === 'col-menu-rule') {
      const col = Number(target.dataset.colIdx);
      const ruleId = target.dataset.rule;
      const extra = target.dataset.extra ? JSON.parse(target.dataset.extra) : {};
      closeModal();
      pushHistoryAndApply({ ruleId, params: { column: col, ...extra } }, 'confirmed');
      return;
    }
  });

  // Double-click any data cell to edit inline
  document.addEventListener('dblclick', (e) => {
    const td = e.target.closest('td[data-action="select-cell"]');
    if (!td || state.gridShowOriginal) return;
    state.editingCell = {
      rowId: td.dataset.rowId,
      colIdx: Number(td.dataset.colIdx),
    };
    render();
  });

  // Global keyboard shortcuts: Ctrl+K, Ctrl+Z, Ctrl+Y, Esc
  document.addEventListener('keydown', (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      state.cmdQuery = '';
      renderCmdPalette();
      return;
    }
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (!inInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (state.undoStack.length > 0) {
        e.preventDefault();
        undoLast();
      }
      return;
    }
    if (!inInput && (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      if (state.redoStack.length > 0) {
        e.preventDefault();
        redoLast();
      }
    }
  });

  // Global anywhere-in-window file Drag & Drop overlay
  let globalDragCounter = 0;
  let globalDropEl = null;
  function showGlobalDrop() {
    if (globalDropEl) return;
    globalDropEl = document.createElement('div');
    globalDropEl.className = 'global-drop-overlay';
    globalDropEl.innerHTML = `<div class="global-drop-box">
      <div style="font-size:32px;margin-bottom:8px;">📂</div>
      <div style="font-size:17px;font-weight:700;color:#0f172a;">${state.lang === 'zh' ? '松开鼠标即可本地载入 CSV / TSV 文件' : 'Drop CSV / TSV files anywhere to open locally'}</div>
      <div style="font-size:13px;color:#475569;margin-top:4px;">${state.lang === 'zh' ? '单文件直接诊断 · 多文件自动进入批量合并' : 'Single file opens Health Report · Multiple files open Batch Rescue'}</div>
    </div>`;
    document.body.appendChild(globalDropEl);
  }
  function hideGlobalDrop() {
    globalDragCounter = 0;
    if (globalDropEl) {
      globalDropEl.remove();
      globalDropEl = null;
    }
  }
  window.addEventListener('dragenter', (e) => {
    if (state.dragColIdx !== null) return; // Ignore internal column-header drag
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
      globalDragCounter++;
      showGlobalDrop();
    }
  });
  window.addEventListener('dragover', (e) => {
    if (state.dragColIdx !== null) return;
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
    }
  });
  window.addEventListener('dragleave', (e) => {
    if (state.dragColIdx !== null) return;
    globalDragCounter--;
    if (globalDragCounter <= 0) hideGlobalDrop();
  });
  window.addEventListener('drop', async (e) => {
    if (state.dragColIdx !== null) return;
    const files = Array.from(e.dataTransfer?.files || []);
    hideGlobalDrop();
    if (files.length > 0) {
      e.preventDefault();
      await handleIncomingFiles(files);
    }
  });

  // ============================================================================
  // Interactive Guide Reader & Meta-Doc Viewer (Works in Canvas, file:// & Web)
  // ============================================================================
  function openGuideModal(slug) {
    const guides = window.__CSV_RESCUE_GUIDES__ || [];
    const g = guides.find((x) => x.slug === slug);
    if (!g) return;
    const bodyHtml = `
      <div style="max-height:66vh;overflow-y:auto;padding-right:4px;">
        <div style="margin-bottom:10px;"><span class="meta-chip" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;font-weight:700;">${esc(g.tag)} · ${esc(g.readTime)}</span></div>
        <div class="notice info" style="margin:0 0 14px;font-size:13px;"><strong>Direct Answer:</strong> ${esc(g.quickAnswer)}</div>
        <h4 style="margin:0 0 6px;font-size:15px;color:#0f172a;">${esc(g.storyHeading)}</h4>
        ${g.storyParagraphs.map((para) => `<p style="margin:0 0 10px;font-size:13.5px;color:#334155;line-height:1.6;">${esc(para)}</p>`).join('')}
        <h4 style="margin:14px 0 6px;font-size:14.5px;color:#0f172a;">Before &amp; After Examples</h4>
        <div class="table-wrap" style="max-height:220px;margin-bottom:14px;">
          <table class="data-table">
            <thead><tr><th>Scenario</th><th>Broken Input</th><th>Repaired Output</th><th>Result</th></tr></thead>
            <tbody>
              ${g.beforeAfter.map((r) => `<tr><td><strong>${esc(r.field)}</strong></td><td style="color:#b91c1c;font-family:monospace;font-size:12px;">${esc(r.before)}</td><td style="color:#047857;font-family:monospace;font-size:12px;font-weight:600;">${esc(r.after)}</td><td>${esc(r.note)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <h4 style="margin:14px 0 6px;font-size:14.5px;color:#0f172a;">Step-by-Step Local Workflow</h4>
        <ol style="margin:0 0 12px;padding-left:20px;font-size:13.5px;color:#334155;line-height:1.6;">
          ${g.steps.map((s) => `<li style="margin-bottom:5px;">${esc(s)}</li>`).join('')}
        </ol>
        <div class="notice warn" style="margin:0 0 14px;font-size:12.5px;">${esc(g.boundaryNote)}</div>
        <h4 style="margin:14px 0 6px;font-size:14.5px;color:#0f172a;">Frequently Asked Questions</h4>
        ${g.faqs.map((f) => `<div style="border-top:1px solid #e2e8f0;padding:8px 0;"><div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:2px;">${esc(f.q)}</div><div style="font-size:13px;color:#475569;">${esc(f.a)}</div></div>`).join('')}
      </div>
    `;
    const footerHtml = `
      <button class="btn" data-action="close-modal">${state.lang === 'zh' ? '关闭' : 'Close'}</button>
      ${g.demoSample ? `<button class="btn btn-primary" data-action="guide-load-demo" data-sample="${esc(g.demoSample)}">⚡ ${state.lang === 'zh' ? '在工作台载入对应样本实测 →' : 'Try Matching Sample in Workbench →'}</button>` : ''}
    `;
    openModal(g.title, bodyHtml, footerHtml);
  }

  function openMetaDocModal(docKey) {
    const docs = window.__CSV_RESCUE_META_DOCS__ || {};
    const content = docs[docKey];
    if (!content) return;
    openModal(
      `${docKey} — GEO / AI-Crawler Preview`,
      `<pre class="preview-pre" style="max-height:60vh;overflow:auto;white-space:pre-wrap;">${esc(content)}</pre>`,
      `<button class="btn" data-action="close-modal">${state.lang === 'zh' ? '关闭' : 'Close'}</button>
       <button class="btn btn-primary" data-action="download-meta-doc" data-doc-key="${esc(docKey)}">⬇ ${state.lang === 'zh' ? '下载 ' + docKey : 'Download ' + docKey}</button>`
    );
  }

  document.addEventListener('click', async (e) => {
    const guideLink = e.target.closest('a[data-action="open-guide"]');
    if (guideLink && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      openGuideModal(guideLink.dataset.guideSlug);
      return;
    }
    const metaLink = e.target.closest('a[data-action="open-meta-doc"]');
    if (metaLink && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      openMetaDocModal(metaLink.dataset.docKey);
      return;
    }
    const demoBtn = e.target.closest('[data-action="guide-load-demo"]');
    if (demoBtn) {
      const sample = SAMPLES[demoBtn.dataset.sample];
      closeModal();
      if (sample) {
        await loadBytesIntoWorkspace(sample.name, C.encodeUtf8(sample.content));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    const dlBtn = e.target.closest('[data-action="download-meta-doc"]');
    if (dlBtn) {
      const key = dlBtn.dataset.docKey;
      const content = (window.__CSV_RESCUE_META_DOCS__ || {})[key];
      if (content) {
        triggerDownload(content, 'text/plain;charset=utf-8', key);
        showToast(`Downloaded ${key}`);
      }
    }
  });

  // Initial render
  render();
})();
