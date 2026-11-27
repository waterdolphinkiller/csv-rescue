/**
 * @fileoverview Zero-dependency GEO & SEO Static Site Generator for CSV Rescue.
 * Imports shared guides & meta docs from `scripts/geo-content.mjs` and builds `site/`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWeb } from './build-web.mjs';
import {
  LASTMOD,
  GUIDES,
  buildRobotsTxt,
  buildSitemapXml,
  buildLlmsTxt,
  buildLlmsFullTxt,
} from './geo-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const siteDir = path.join(rootDir, 'site');
const SITE_URL = (process.env.SITE_URL || 'https://csv-rescue.github.io/csv-rescue').replace(/\/+$/, '');

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderGuideHtml(guide, allGuides) {
  const canonical = `${SITE_URL}/guides/${guide.slug}/`;
  const otherGuides = allGuides.filter((g) => g.slug !== guide.slug);
  const jsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: guide.title,
          description: guide.description,
          datePublished: LASTMOD,
          dateModified: LASTMOD,
          inLanguage: 'en-US',
          author: { '@type': 'Organization', name: 'CSV Rescue Open-Source Project', url: `${SITE_URL}/` },
          publisher: { '@type': 'Organization', name: 'CSV Rescue', url: `${SITE_URL}/` },
          mainEntityOfPage: canonical,
        },
        {
          '@type': 'FAQPage',
          mainEntity: guide.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'CSV Rescue', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: guide.shortTitle, item: canonical },
          ],
        },
      ],
    },
    null,
    2
  ).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(guide.title)} — CSV Rescue</title>
  <meta name="description" content="${esc(guide.description)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="alternate" type="text/markdown" href="../../llms.txt" title="CSV Rescue LLMs.txt" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CSV Rescue" />
  <meta property="og:title" content="${esc(guide.title)}" />
  <meta property="og:description" content="${esc(guide.description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(guide.title)}" />
  <meta name="twitter:description" content="${esc(guide.description)}" />
  <script type="application/ld+json">
${jsonLd}
  </script>
  <style>
    :root { --bg: #f8fafc; --card: #ffffff; --text: #0f172a; --muted: #475569; --border: #e2e8f0; --brand: #2563eb; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }
    .topbar { background: #fff; border-bottom: 1px solid var(--border); padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; z-index: 20; }
    .brand { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--text); font-weight: 800; font-size: 15px; }
    .mark { width: 26px; height: 26px; border-radius: 7px; background: var(--brand); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; }
    .cta { display: inline-flex; align-items: center; gap: 6px; background: var(--brand); color: #fff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; }
    .cta:hover { background: #1d4ed8; }
    main { max-width: 820px; margin: 28px auto 48px; padding: 0 20px; }
    .crumb { font-size: 12.5px; color: var(--muted); margin-bottom: 12px; }
    .crumb a { color: var(--brand); text-decoration: none; }
    .tag { display: inline-block; font-size: 11.5px; font-weight: 700; color: var(--brand); background: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 9px; border-radius: 99px; margin-bottom: 10px; }
    h1 { margin: 0 0 12px; font-size: clamp(24px, 3.5vw, 32px); line-height: 1.22; letter-spacing: -0.02em; }
    .answer-box { background: #eff6ff; border-left: 4px solid var(--brand); border-radius: 8px; padding: 14px 16px; margin: 18px 0 24px; font-size: 14.5px; color: #1e293b; }
    .answer-box strong { color: #1e3a8a; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; margin-bottom: 18px; }
    h2 { margin: 0 0 10px; font-size: 19px; color: var(--text); }
    p { margin: 0 0 12px; color: #334155; font-size: 14.8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; margin-top: 8px; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border); }
    th { background: #f8fafc; color: var(--muted); font-weight: 600; }
    .bad { color: #b91c1c; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
    .good { color: #047857; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; font-weight: 600; }
    ol { margin: 8px 0 0; padding-left: 20px; }
    ol li { margin-bottom: 8px; font-size: 14.5px; color: #334155; }
    .boundary { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; font-size: 13.5px; color: #92400e; margin-top: 12px; }
    .faq-item { border-top: 1px solid var(--border); padding: 12px 0; }
    .faq-item:first-of-type { border-top: none; padding-top: 4px; }
    .faq-item h3 { margin: 0 0 4px; font-size: 15px; color: var(--text); }
    .cta-banner { background: #0f172a; color: #fff; border-radius: 12px; padding: 22px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; margin: 24px 0; }
    .cta-banner p { color: #cbd5e1; margin: 4px 0 0; font-size: 13.5px; }
    .related { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 10px; }
    .related a { display: block; background: #fff; border: 1px solid var(--border); border-radius: 9px; padding: 12px; text-decoration: none; color: var(--text); font-size: 13px; font-weight: 600; }
    .related a:hover { border-color: var(--brand); }
    footer { max-width: 820px; margin: 0 auto 36px; padding: 0 20px; font-size: 12.5px; color: var(--muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
    footer a { color: var(--brand); text-decoration: none; }
  </style>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="../../"><span class="mark">CR</span> CSV Rescue</a>
    <a class="cta" href="../../">Open Local Workbench →</a>
  </header>
  <main>
    <nav class="crumb" aria-label="Breadcrumb"><a href="../../">CSV Rescue</a> / Guides / ${esc(guide.shortTitle)}</nav>
    <span class="tag">${esc(guide.tag)} · ${esc(guide.readTime)}</span>
    <h1>${esc(guide.title)}</h1>

    <section class="answer-box" aria-label="Quick Answer">
      <strong>Direct Answer:</strong> ${esc(guide.quickAnswer)}
    </section>

    <article class="card">
      <h2>${esc(guide.storyHeading)}</h2>
      ${guide.storyParagraphs.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
    </article>

    <section class="card">
      <h2>Before &amp; After Repair Examples</h2>
      <table>
        <thead>
          <tr><th>Scenario</th><th>Broken Input</th><th>Repaired Output</th><th>Result</th></tr>
        </thead>
        <tbody>
          ${guide.beforeAfter
            .map(
              (r) =>
                `<tr><td><strong>${esc(r.field)}</strong></td><td class="bad">${esc(r.before)}</td><td class="good">${esc(r.after)}</td><td>${esc(r.note)}</td></tr>`
            )
            .join('\n          ')}
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>Step-by-Step Local Repair Workflow</h2>
      <ol>
        ${guide.steps.map((s) => `<li>${esc(s)}</li>`).join('\n        ')}
      </ol>
      <div class="boundary">${esc(guide.boundaryNote)}</div>
    </section>

    <section class="cta-banner">
      <div>
        <strong style="font-size:16px;">Ready to fix your file without uploading a single byte?</strong>
        <p>100% browser-local Web Worker · Native .xlsx &amp; CSV · Instant Ctrl+Z undo · Free MIT open-source</p>
      </div>
      <a class="cta" href="../../">Launch CSV Rescue Now →</a>
    </section>

    <section class="card">
      <h2>Frequently Asked Questions</h2>
      ${guide.faqs
        .map(
          (f) => `<div class="faq-item"><h3>${esc(f.q)}</h3><p style="margin-bottom:0;">${esc(f.a)}</p></div>`
        )
        .join('\n      ')}
    </section>

    <section>
      <h2 style="font-size:16px;margin-bottom:8px;">More Local CSV &amp; Excel Repair Guides</h2>
      <div class="related">
        ${otherGuides
          .map((g) => `<a href="../${esc(g.slug)}/">${esc(g.shortTitle)} →</a>`)
          .join('\n        ')}
      </div>
    </section>
  </main>
  <footer>
    <span>CSV Rescue v2.4.0 · MIT Open-Source · 100% Local-First</span>
    <span><a href="../../">Workbench</a> · <a href="../../llms.txt">llms.txt</a> · <a href="../../sitemap.xml">sitemap.xml</a></span>
  </footer>
</body>
</html>
`;
}

async function main() {
  await fs.mkdir(siteDir, { recursive: true });

  const extraOut = process.argv[2] || null;
  const html = await buildWeb(extraOut);
  await fs.writeFile(path.join(siteDir, 'index.html'), html, 'utf-8');

  for (const guide of GUIDES) {
    const dir = path.join(siteDir, 'guides', guide.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), renderGuideHtml(guide, GUIDES), 'utf-8');
  }

  const robots = buildRobotsTxt(SITE_URL);
  const sitemap = buildSitemapXml(SITE_URL);
  const llms = buildLlmsTxt(SITE_URL);
  const llmsFull = buildLlmsFullTxt(SITE_URL);

  await fs.writeFile(path.join(siteDir, 'robots.txt'), robots, 'utf-8');
  await fs.writeFile(path.join(siteDir, 'sitemap.xml'), sitemap, 'utf-8');
  await fs.writeFile(path.join(siteDir, 'llms.txt'), llms, 'utf-8');
  await fs.writeFile(path.join(siteDir, 'llms-full.txt'), llmsFull, 'utf-8');

  await fs.writeFile(path.join(rootDir, 'llms.txt'), llms, 'utf-8');
  await fs.writeFile(path.join(rootDir, 'llms-full.txt'), llmsFull, 'utf-8');

  console.log(`Built GEO/SEO static site in ${siteDir} (1 workbench + ${GUIDES.length} guides + robots.txt + sitemap.xml + llms.txt + llms-full.txt)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
