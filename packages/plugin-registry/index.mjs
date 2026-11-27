/**
 * @fileoverview CSV Rescue v2.0 Plugin Registry & Schema Gate.
 * Enables third-party and community plugins to register custom:
 *   - Diagnostic checks (table-scoped or column-scoped for incremental re-runs)
 *   - Repair rules (with declarative parameter schema validation)
 *   - Region Packs (phone rules, default date order, postal regex, currencies)
 *   - Business Data Packs (target schemas & aliases)
 *   - Plan Providers (local NL parser, WebLLM, Ollama, or optional API adapters)
 */

export const ENGINE_VERSION = '2.0.0';

/**
 * Built-in Region Packs (extensible via registerRegionPack).
 */
export const BUILTIN_REGION_PACKS = {
  MY: {
    id: 'MY',
    name: 'Malaysia',
    dialCode: '+60',
    defaultDateOrder: 'DMY',
    postalPattern: /^\d{5}$/,
    currencySymbols: ['RM', 'MYR'],
    normalizePhone(cleaned) {
      if (cleaned.startsWith('+')) return cleaned;
      if (cleaned.startsWith('60') && cleaned.length >= 10) return `+${cleaned}`;
      if (cleaned.startsWith('0') && cleaned.length >= 9) return `+60${cleaned.slice(1)}`;
      if (/^1\d{7,9}$/.test(cleaned)) return `+60${cleaned}`;
      return null;
    },
  },
  SG: {
    id: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    defaultDateOrder: 'DMY',
    postalPattern: /^\d{6}$/,
    currencySymbols: ['S$', 'SGD'],
    normalizePhone(cleaned) {
      if (cleaned.startsWith('+')) return cleaned;
      if (cleaned.startsWith('65') && cleaned.length >= 10) return `+${cleaned}`;
      if (/^[689]\d{7}$/.test(cleaned)) return `+65${cleaned}`;
      return null;
    },
  },
  US: {
    id: 'US',
    name: 'United States',
    dialCode: '+1',
    defaultDateOrder: 'MDY',
    postalPattern: /^\d{5}(?:-\d{4})?$/,
    currencySymbols: ['$', 'USD'],
    normalizePhone(cleaned) {
      if (cleaned.startsWith('+')) return cleaned;
      if (cleaned.startsWith('1') && cleaned.length === 11) return `+${cleaned}`;
      if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
      return null;
    },
  },
  CN: {
    id: 'CN',
    name: 'China',
    dialCode: '+86',
    defaultDateOrder: 'YMD',
    postalPattern: /^\d{6}$/,
    currencySymbols: ['¥', 'CNY', 'RMB'],
    normalizePhone(cleaned) {
      if (cleaned.startsWith('+')) return cleaned;
      if (cleaned.startsWith('86') && cleaned.length === 13) return `+${cleaned}`;
      if (/^1[3-9]\d{9}$/.test(cleaned)) return `+86${cleaned}`;
      return null;
    },
  },
};

/**
 * Validate rule parameters against a declarative schema object.
 * Protects against malformed UI inputs or future LLM-generated rule plans.
 *
 * @param {Record<string, any>} params
 * @param {Record<string, { type: 'number'|'string'|'boolean'|'array', required?: boolean, enum?: any[] }>} schema
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRuleParams(params = {}, schema = {}) {
  const errors = [];
  for (const [key, spec] of Object.entries(schema)) {
    const val = params[key];
    if (val === undefined || val === null) {
      if (spec.required) errors.push(`Missing required parameter "${key}"`);
      continue;
    }
    if (spec.type === 'array') {
      if (!Array.isArray(val)) errors.push(`Parameter "${key}" must be an array`);
    } else if (typeof val !== spec.type) {
      errors.push(`Parameter "${key}" must be of type ${spec.type}, got ${typeof val}`);
    }
    if (spec.enum && !spec.enum.includes(val)) {
      errors.push(`Parameter "${key}" must be one of [${spec.enum.join(', ')}]`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Create an isolated Plugin Registry instance (supports default global singleton + test instances).
 */
export function createPluginRegistry() {
  const diagnostics = new Map();
  const rules = new Map();
  const regionPacks = new Map(Object.entries(BUILTIN_REGION_PACKS));
  const businessPacks = new Map();
  const planProviders = new Map();

  return {
    registerDiagnostic(plugin) {
      if (!plugin || !plugin.id || typeof plugin.run !== 'function') {
        throw new Error('Diagnostic plugin requires { id, run(ctx) }');
      }
      diagnostics.set(plugin.id, {
        scope: 'table', // 'table' | 'column'
        category: 'columns',
        ...plugin,
      });
      return this;
    },
    unregisterDiagnostic(id) {
      diagnostics.delete(id);
      return this;
    },
    listDiagnostics() {
      return Array.from(diagnostics.values());
    },

    registerRule(plugin) {
      if (!plugin || !plugin.id || typeof plugin.execute !== 'function') {
        throw new Error('Rule plugin requires { id, execute(table, params, ctx) }');
      }
      rules.set(plugin.id, {
        risk: 'low',
        schema: {},
        ...plugin,
      });
      return this;
    },
    getRule(id) {
      return rules.get(id) || null;
    },
    listRules() {
      return Array.from(rules.values());
    },

    registerRegionPack(pack) {
      if (!pack || !pack.id) throw new Error('Region pack requires { id }');
      regionPacks.set(pack.id.toUpperCase(), pack);
      return this;
    },
    getRegionPack(id) {
      return regionPacks.get((id || 'MY').toUpperCase()) || regionPacks.get('MY');
    },
    listRegionPacks() {
      return Array.from(regionPacks.values());
    },

    registerBusinessPack(pack) {
      if (!pack || !pack.id || !Array.isArray(pack.fields)) {
        throw new Error('Business pack requires { id, fields }');
      }
      businessPacks.set(pack.id, pack);
      return this;
    },
    getBusinessPack(id) {
      return businessPacks.get(id) || null;
    },
    listBusinessPacks() {
      return Array.from(businessPacks.values());
    },

    registerPlanProvider(provider) {
      if (!provider || !provider.id || typeof provider.plan !== 'function') {
        throw new Error('Plan provider requires { id, plan(prompt, headers, ctx) }');
      }
      planProviders.set(provider.id, provider);
      return this;
    },
    getPlanProvider(id = 'local-deterministic') {
      return planProviders.get(id) || null;
    },
    listPlanProviders() {
      return Array.from(planProviders.values());
    },
  };
}

export const defaultRegistry = createPluginRegistry();
