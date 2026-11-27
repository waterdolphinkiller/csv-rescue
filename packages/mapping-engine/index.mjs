/**
 * @fileoverview Mapping Engine — Column Mapping Studio, Supplier Memory Templates
 * with Schema Drift detection, and Business Data Packs (E-commerce, CRM, Marketing, Finance).
 */

export const BUSINESS_PACKS = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce Product Catalog',
    nameZh: '电商商品目录规则包',
    description: 'Standardize SKU, product title, price, currency, stock, category, and image URLs.',
    fields: [
      {
        key: 'sku',
        label: 'SKU',
        required: true,
        aliases: ['sku', 'sku code', 'item code', 'product_id', 'product id', '货号', '商品编码'],
        typeHint: 'text',
      },
      {
        key: 'product_name',
        label: 'Product Name',
        required: true,
        aliases: ['product name', 'item name', 'item desc', 'product title', 'title', '商品名称', '品名'],
        typeHint: 'text',
      },
      {
        key: 'price',
        label: 'Price',
        required: true,
        aliases: ['price', 'unit price', 'selling price', 'retail price', '价格', '单价'],
        typeHint: 'currency',
      },
      {
        key: 'stock',
        label: 'Stock',
        required: false,
        aliases: ['stock', 'qty', 'qty available', 'quantity', 'inventory', '库存'],
        typeHint: 'number',
      },
      {
        key: 'category',
        label: 'Category',
        required: false,
        aliases: ['category', 'dept', 'department', '分类', '类目'],
        typeHint: 'text',
      },
      {
        key: 'image_url',
        label: 'Image URL',
        required: false,
        aliases: ['image url', 'image', 'photo', 'img', '图片链接'],
        typeHint: 'url',
      },
      {
        key: 'status',
        label: 'Status',
        required: false,
        aliases: ['status', 'product status', 'active', '状态'],
        typeHint: 'text',
      },
    ],
  },
  crm: {
    id: 'crm',
    name: 'CRM Contacts',
    nameZh: 'CRM 联系人规则包',
    description: 'Standardize full name, email, phone (+60/+65), company, country, and postal code.',
    fields: [
      {
        key: 'full_name',
        label: 'Full Name',
        required: true,
        aliases: ['full name', 'name', 'contact name', 'customer name', '姓名', '联系人'],
        typeHint: 'text',
      },
      {
        key: 'first_name',
        label: 'First Name',
        required: false,
        aliases: ['first name', 'fname', 'given name'],
        typeHint: 'text',
      },
      {
        key: 'last_name',
        label: 'Last Name',
        required: false,
        aliases: ['last name', 'lname', 'surname', 'family name'],
        typeHint: 'text',
      },
      {
        key: 'email',
        label: 'Email',
        required: true,
        aliases: ['email', 'e-mail', 'email address', 'work email', '邮箱'],
        typeHint: 'email',
      },
      {
        key: 'phone',
        label: 'Phone',
        required: false,
        aliases: ['phone', 'phone number', 'mobile', 'mobile phone', 'cell', 'cell phone', 'work phone', 'tel', 'whatsapp', '电话', '手机'],
        typeHint: 'phone',
      },
      {
        key: 'company',
        label: 'Company',
        required: false,
        aliases: ['company', 'company name', 'organization', 'account', '公司'],
        typeHint: 'text',
      },
      {
        key: 'postal_code',
        label: 'Postal Code',
        required: false,
        aliases: ['postal code', 'postcode', 'zip', 'zip code', '邮编'],
        typeHint: 'postal_code',
      },
      {
        key: 'state',
        label: 'State / Province',
        required: false,
        aliases: ['state', 'province', 'state code'],
        typeHint: 'text',
      },
      {
        key: 'country',
        label: 'Country',
        required: false,
        aliases: ['country', 'region', '国家', '地区'],
        typeHint: 'text',
      },
    ],
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Campaign',
    nameZh: '营销投放报表规则包',
    description: 'Align campaign IDs, UTM source/medium/campaign, landing URLs, clicks, and conversions.',
    fields: [
      { key: 'campaign_id', label: 'Campaign ID', required: true, aliases: ['campaign id', 'cid', 'ad id'], typeHint: 'text' },
      { key: 'utm_source', label: 'UTM Source', required: true, aliases: ['utm source', 'source', 'channel'], typeHint: 'text' },
      { key: 'utm_medium', label: 'UTM Medium', required: false, aliases: ['utm medium', 'medium'], typeHint: 'text' },
      { key: 'utm_campaign', label: 'UTM Campaign', required: false, aliases: ['utm campaign', 'campaign', 'campaign name'], typeHint: 'text' },
      { key: 'landing_url', label: 'Landing Page URL', required: false, aliases: ['landing url', 'url', 'destination url'], typeHint: 'url' },
      { key: 'clicks', label: 'Clicks', required: false, aliases: ['clicks', 'total clicks'], typeHint: 'number' },
      { key: 'conversions', label: 'Conversions', required: false, aliases: ['conversions', 'leads', 'orders'], typeHint: 'number' },
      { key: 'date', label: 'Date', required: false, aliases: ['date', 'report date', 'day'], typeHint: 'date' },
    ],
  },
  finance: {
    id: 'finance',
    name: 'Finance Operations',
    nameZh: '财务运营对账规则包',
    description: 'Validate invoice numbers, vendor codes, dates, currencies, and transaction amounts.',
    fields: [
      { key: 'invoice_no', label: 'Invoice No', required: true, aliases: ['invoice', 'invoice no', 'inv no', '发票号'], typeHint: 'text' },
      { key: 'vendor_code', label: 'Vendor Code', required: true, aliases: ['vendor', 'vendor code', 'supplier id', '供应商代码'], typeHint: 'text' },
      { key: 'tx_date', label: 'Transaction Date', required: true, aliases: ['date', 'tx date', 'invoice date', '日期'], typeHint: 'date' },
      { key: 'currency', label: 'Currency', required: false, aliases: ['currency', 'ccy', '币种'], typeHint: 'text' },
      { key: 'amount', label: 'Amount', required: true, aliases: ['amount', 'total', 'net amount', '金额'], typeHint: 'currency' },
    ],
  },
};

function normalizeHeaderName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Suggest column mappings from source headers + column profiles to a target Business Pack.
 * Always explains WHY each match was made (Exact / Alias / Inferred / Unmapped).
 *
 * @param {string[]} sourceHeaders
 * @param {Array<{ index: number, name: string, inferredType: string }>} columnProfiles
 * @param {string} packId
 * @param {Record<string, string>} [savedTemplateMap]
 */
export function suggestColumnMappings(sourceHeaders, columnProfiles, packId = 'ecommerce', savedTemplateMap = null) {
  const pack = BUSINESS_PACKS[packId] || BUSINESS_PACKS.ecommerce;
  const usedTargets = new Set();

  return sourceHeaders.map((srcHeader, idx) => {
    const norm = normalizeHeaderName(srcHeader);
    const profile = columnProfiles[idx];

    // 1. Saved Supplier Template match
    if (savedTemplateMap && savedTemplateMap[srcHeader]) {
      const targetKey = savedTemplateMap[srcHeader];
      usedTargets.add(targetKey);
      return {
        sourceIndex: idx,
        sourceColumn: srcHeader,
        targetField: targetKey,
        matchType: 'alias',
        reason: 'Matched saved Supplier Memory template',
      };
    }

    // 2. Exact match
    for (const field of pack.fields) {
      if (usedTargets.has(field.key)) continue;
      if (norm === normalizeHeaderName(field.key) || norm === normalizeHeaderName(field.label)) {
        usedTargets.add(field.key);
        return {
          sourceIndex: idx,
          sourceColumn: srcHeader,
          targetField: field.key,
          matchType: 'exact',
          reason: `Exact header match with "${field.label}"`,
        };
      }
    }

    // 3. Alias match
    for (const field of pack.fields) {
      if (usedTargets.has(field.key)) continue;
      const hit = field.aliases.find((a) => normalizeHeaderName(a) === norm);
      if (hit) {
        usedTargets.add(field.key);
        return {
          sourceIndex: idx,
          sourceColumn: srcHeader,
          targetField: field.key,
          matchType: 'alias',
          reason: `Matched known alias "${hit}" → ${field.label}`,
        };
      }
    }

    // 4. Type + Sample heuristic match
    if (profile && profile.inferredType !== 'text') {
      const typeMatch = pack.fields.find(
        (f) => !usedTargets.has(f.key) && f.typeHint === profile.inferredType
      );
      if (typeMatch) {
        usedTargets.add(typeMatch.key);
        return {
          sourceIndex: idx,
          sourceColumn: srcHeader,
          targetField: typeMatch.key,
          matchType: 'inferred',
          reason: `Inferred from column data type (${profile.inferredType})`,
        };
      }
    }

    return {
      sourceIndex: idx,
      sourceColumn: srcHeader,
      targetField: '',
      matchType: 'manual',
      reason: 'No automatic match — choose target field or keep original',
    };
  });
}

/**
 * Detect schema drift between incoming file headers and a saved Supplier Memory template.
 * @param {string[]} currentHeaders
 * @param {{ name: string, version: number, sourceHeaders: string[], mapping: Record<string, string> }} template
 */
export function detectSchemaDrift(currentHeaders, template) {
  const prevSet = new Set(template.sourceHeaders || []);
  const currSet = new Set(currentHeaders);

  const addedColumns = currentHeaders.filter((h) => !prevSet.has(h));
  const missingColumns = (template.sourceHeaders || []).filter((h) => !currSet.has(h));
  const matchedColumns = currentHeaders.filter((h) => prevSet.has(h));
  const hasDrift = addedColumns.length > 0 || missingColumns.length > 0;

  return {
    templateName: template.name,
    templateVersion: template.version,
    hasDrift,
    addedColumns,
    missingColumns,
    matchedColumns,
    matchRatio:
      (template.sourceHeaders?.length || 0) > 0
        ? Number((matchedColumns.length / template.sourceHeaders.length).toFixed(2))
        : 0,
  };
}

/**
 * Apply confirmed column mapping to produce a standardized table.
 * @param {{ headers: string[], rows: Array<any> }} table
 * @param {Array<{ sourceIndex: number, sourceColumn: string, targetField: string }>} mappings
 * @param {boolean} [keepUnmapped=true]
 */
export function applyColumnMapping(table, mappings, keepUnmapped = true) {
  const activeMappings = mappings.filter((m) => m.targetField || keepUnmapped);
  const nextHeaders = activeMappings.map((m) => m.targetField || m.sourceColumn);
  const nextRows = table.rows.map((r) => ({
    ...r,
    cells: activeMappings.map((m) => r.cells[m.sourceIndex] ?? ''),
  }));
  return { headers: nextHeaders, rows: nextRows };
}
