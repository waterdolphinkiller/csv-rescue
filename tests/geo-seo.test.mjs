import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const siteDir = path.join(rootDir, 'site');

test('Main workbench HTML embeds valid SoftwareApplication + FAQPage JSON-LD and editorial footer without breaking scripts', async () => {
  const html = await fs.readFile(path.join(rootDir, 'apps/web/index.html'), 'utf-8');
  assert.match(html, /<meta name="description"/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<link rel="canonical"/);
  assert.match(html, /<footer class="editorial-footer"/);

  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ldMatch, 'JSON-LD script tag missing');
  const parsed = JSON.parse(ldMatch[1]);
  assert.ok(Array.isArray(parsed['@graph']), 'JSON-LD @graph missing');
  const types = parsed['@graph'].map((n) => n['@type']);
  assert.ok(types.includes('SoftwareApplication'), 'Missing SoftwareApplication schema');
  assert.ok(types.includes('FAQPage'), 'Missing FAQPage schema');

  // Verify both runtime inline scripts syntax-check cleanly
  const scriptRe = /<script>([\s\S]*?)<\/script>/g;
  let m;
  let count = 0;
  while ((m = scriptRe.exec(html)) !== null) {
    count++;
    // eslint-disable-next-line no-new-func
    new Function(m[1]);
  }
  assert.equal(count, 2, 'Expected 2 runtime inline <script> blocks');
});

test('Static site includes 5 story-driven US guides, robots.txt allowing AI search bots, valid sitemap.xml, and llms.txt/llms-full.txt', async () => {
  const expectedSlugs = [
    'fix-us-zip-codes-leading-zeros-csv',
    'clean-csv-without-uploading-pii',
    'fix-utf8-mojibake-encoding-csv-offline',
    'fix-shopify-quickbooks-csv-import-errors',
    'convert-multi-sheet-xlsx-to-clean-csv-offline',
  ];

  for (const slug of expectedSlugs) {
    const p = path.join(siteDir, 'guides', slug, 'index.html');
    const content = await fs.readFile(p, 'utf-8');
    assert.match(content, /<script type="application\/ld\+json">/);
    assert.match(content, /Direct Answer:/);
    assert.match(content, /href="\.\.\/\.\.\/"/);
    const ld = JSON.parse(content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const types = ld['@graph'].map((n) => n['@type']);
    assert.ok(types.includes('Article'), `${slug} missing Article schema`);
    assert.ok(types.includes('FAQPage'), `${slug} missing FAQPage schema`);
  }

  const robots = await fs.readFile(path.join(siteDir, 'robots.txt'), 'utf-8');
  for (const bot of ['Googlebot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'PerplexityBot']) {
    assert.ok(robots.includes(`User-agent: ${bot}`), `robots.txt missing ${bot}`);
  }

  const sitemap = await fs.readFile(path.join(siteDir, 'sitemap.xml'), 'utf-8');
  for (const slug of expectedSlugs) {
    assert.ok(sitemap.includes(`/guides/${slug}/`), `sitemap.xml missing ${slug}`);
  }

  const llms = await fs.readFile(path.join(siteDir, 'llms.txt'), 'utf-8');
  const llmsFull = await fs.readFile(path.join(siteDir, 'llms-full.txt'), 'utf-8');
  assert.ok(llms.includes('# CSV Rescue'));
  assert.ok(llms.includes('llms-full.txt'));
  assert.ok(llmsFull.includes('500,000 rows'));
});
