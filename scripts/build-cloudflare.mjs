#!/usr/bin/env node
// Build only the public travel portal. Source files remain compatible with GitHub Pages.
import { readFile, writeFile, mkdir, rm, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Script } from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY_URL = 'https://ryuyasuginaka.github.io/world-travel-season-calendar/';
// No directory copies: adding any public asset requires an explicit entry here.
export const COPY_FILES = Object.freeze([
  'css/home.css', 'css/style.css', 'js/home.js', 'js/integrations.js',
  'assets/favicon.svg', 'assets/hero.jpg', 'assets/ogp.jpg',
  'assets/home/hero.jpg', 'assets/home/street.jpg', 'assets/home/market.jpg',
  'assets/home/lake.jpg', 'assets/home/train.jpg', 'assets/home/packing.jpg',
]);
const GENERATED_FILES = ['index.html', 'travel.html', 'js/app.js', 'js/data.js',
  'js/config.js', 'robots.txt', 'sitemap.xml', '404.html'];

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function normalizeBaseUrl(value) {
  ensure(typeof value === 'string' && /^https:\/\/[a-z0-9.-]+\/?$/i.test(value),
    '--base-url must be a public HTTPS origin, without a path, port, query, or credentials.');
  const url = new URL(value);
  ensure(url.hostname.includes('.') && url.hostname !== 'localhost' &&
    !/^[\d.]+$/.test(url.hostname) &&
    url.hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)),
  '--base-url must use a valid public hostname.');
  return `${url.origin}/`;
}

function replaceCount(source, search, replacement, expected, label) {
  const count = typeof search === 'string' ? source.split(search).length - 1 : [...source.matchAll(search)].length;
  ensure(count === expected, `${label}: expected ${expected} source match(es), found ${count}. Review the source structure before publishing.`);
  return typeof search === 'string' ? source.split(search).join(replacement) : source.replace(search, replacement);
}

export function transformHome(source, base) {
  ensure(!/<link\b[^>]*rel="canonical"|property="og:/i.test(source), 'Home metadata already exists; review the publishing transform.');
  const description = source.match(/<meta name="description" content="([^"]+)">/)?.[1];
  const title = source.match(/<title>([^<]+)<\/title>/)?.[1];
  ensure(description && title, 'Home title or description is missing.');
  const metadata = [
    `<link rel="canonical" href="${base}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="SEASON ATLAS">',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${base}">`,
    `<meta property="og:image" content="${base}assets/home/hero.jpg">`,
    '<meta property="og:locale" content="ja_JP">',
    '<meta name="twitter:card" content="summary_large_image">',
  ].join('\n  ');
  let html = replaceCount(source, '<meta name="robots" content="noindex, nofollow">', metadata, 1, 'Home preview robots');
  html = replaceCount(html, 'href="home.html"', 'href="./"', 2, 'Home logos');
  html = replaceCount(html, /href="index\.html(?=[#"])/g, 'href="travel.html', 11, 'Home travel links');
  html = replaceCount(html, 'このホームはローカル確認用のプレビューです。', '行ってみたい気持ちから、あなたに合う旅を探してみてください。', 1, 'About copy');
  html = replaceCount(html, 'このプレビューでは、既存のカレンダーデータを更新していません。', 'カレンダーや費用は計画の目安です。予約前には、公式情報で最新の状況をご確認ください。', 1, 'Updates copy');
  html = replaceCount(html, 'このプレビューには広告・紹介リンクを設置していません。', '現在、予約・カード紹介のリンクは掲載していません。', 1, 'Advertising copy');
  ensure(!/noindex|ローカル確認|プレビュー|href="(?:home|index)\.html/.test(html), 'Preview content remains in the public home.');
  return html;
}

export function transformTools(source, base) {
  let html = replaceCount(source, 'href="home.html"', 'href="./"', 1, 'Travel logo');
  html = replaceCount(html, `href="${LEGACY_URL}"`, `href="${base}travel"`, 1, 'Travel canonical');
  html = replaceCount(html, `content="${LEGACY_URL}"`, `content="${base}travel"`, 1, 'Travel Open Graph URL');
  html = replaceCount(html, `content="${LEGACY_URL}assets/ogp.jpg"`, `content="${base}assets/ogp.jpg"`, 1, 'Travel Open Graph image');
  html = replaceCount(html, `"url": "${LEGACY_URL}"`, `"url": "${base}travel"`, 1, 'Travel structured data URL');
  html = replaceCount(html, /^      <a href="#trips-section">旅の記録<\/a>\n/gm, '', 1, 'Private records navigation');
  html = replaceCount(html, /<!-- TRIP RECORDS & PROFILE -->\n<section class="trips-section" id="trips-section">[\s\S]*?<\/section>\n\n(?=<!-- FOOTER -->)/g, '', 1, 'Private records section');
  ensure(!/TRIP_RECORDS|PROFILE|trips-section|trips-grid|profile-card/.test(html), 'Private records remain in public HTML.');
  ensure(!html.includes(LEGACY_URL), 'Legacy origin remains in public HTML.');
  return html;
}

export function transformData(source) {
  const marker = '// ===================== 旅の記録・プロフィール =====================\n';
  ensure(source.split(marker).length === 2, 'Private data marker is missing or duplicated.');
  const [publicData, privateData] = source.split(marker);
  // This block must remain the final section. New declarations require a publishing review.
  ensure(/^\/\/ world-trip-roulette より移植\nconst TRIP_RECORDS = \[\n[\s\S]*?\n\];\n\nconst PROFILE = \{\n(?:  [^\n]*\n|\n)*\};\s*$/.test(privateData),
    'Private data layout changed; refusing to publish.');
  ensure((privateData.match(/^const /gm) || []).length === 2, 'Unexpected declaration in private data block.');
  ensure(!/\b(?:TRIP_RECORDS|PROFILE)\b/.test(publicData), 'Private data appears outside its expected block.');
  return publicData;
}

export function transformApp(source) {
  let js = replaceCount(source, /function renderTrips\(\) \{\n[\s\S]*?\n\}\n\n(?=\/\/ ===================== INIT)/g, '', 1, 'Private records renderer');
  js = replaceCount(js, /^renderTrips\(\);\n/gm, '', 1, 'Private renderer initialization');
  js = replaceCount(js, ", 'trips-section'", '', 1, 'Private section navigation');
  ensure(!/\b(?:TRIP_RECORDS|PROFILE|renderTrips)\b|trips-section|trips-grid|profile-card/.test(js), 'Private records code remains in public JavaScript.');
  return js;
}

async function readSource(root, relative) {
  const path = join(root, relative);
  ensure((await lstat(path)).isFile(), `Source must be a regular file, not a symlink: ${relative}`);
  return readFile(path);
}

export async function createBundle(root, baseUrl) {
  const base = normalizeBaseUrl(baseUrl);
  const bundle = new Map();
  for (const file of COPY_FILES) bundle.set(file, await readSource(root, file));
  const readText = async file => (await readSource(root, file)).toString('utf8');
  bundle.set('index.html', transformHome(await readText('home.html'), base));
  bundle.set('travel.html', transformTools(await readText('index.html'), base));
  bundle.set('js/data.js', transformData(await readText('js/data.js')));
  bundle.set('js/app.js', transformApp(await readText('js/app.js')));
  bundle.set('js/config.js', replaceCount(await readText('js/config.js'),
    `baseUrl: '${LEGACY_URL}'`, `baseUrl: '${base}'`, 1, 'Site base URL'));
  bundle.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`);
  bundle.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}</loc></url>\n  <url><loc>${base}travel</loc></url>\n</urlset>\n`);
  bundle.set('404.html', '<!doctype html>\n<html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>ページが見つかりません — SEASON ATLAS</title><body><main><h1>ページが見つかりませんでした。</h1><p>旅の入口から、もう一度探してみてください。</p><a href="/">SEASON ATLAS ホームへ</a></main></body></html>\n');

  ensure(bundle.size === COPY_FILES.length + GENERATED_FILES.length, 'Unexpected bundle file count.');
  for (const [file, content] of bundle) {
    if (file.endsWith('.js')) new Script(content.toString(), { filename: file });
    if (/\.(?:html|js|css|txt|xml|svg)$/.test(file)) {
      ensure(!/profile-placeholder|杉中|Suginaka|2024年10月13日|2024年12月7日/.test(content.toString()), `Private content marker found in ${file}`);
      if (/\.(?:html|js)$/.test(file)) ensure(!/\b(?:TRIP_RECORDS|PROFILE|renderTrips)\b/.test(content.toString()), `Private code marker found in ${file}`);
    }
  }
  // Validate local href/src targets against the same allowlist, including section anchors.
  for (const page of ['index.html', 'travel.html', '404.html']) {
    const html = bundle.get(page).toString();
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = match[1];
      if (/^(?:https?:|data:|mailto:|tel:)/.test(target)) continue;
      const url = new URL(target, `${base}${page}`);
      const targetFile = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      ensure(bundle.has(targetFile), `${page} references a missing public file: ${target}`);
      // Query-like hashes are the legacy filter state, not an element ID.
      if (url.hash && !url.hash.includes('=')) {
        ensure(bundle.get(targetFile).toString().includes(`id="${url.hash.slice(1)}"`), `${page} references a missing section: ${target}`);
      }
    }
  }
  return bundle;
}

async function main() {
  const args = process.argv.slice(2);
  ensure(args.length === 2 && args[0] === '--base-url',
    'Usage: node scripts/build-cloudflare.mjs --base-url https://your-public-host');
  // Validate every source and transform before replacing a previous generated bundle.
  const bundle = await createBundle(ROOT, args[1]);
  const dist = join(ROOT, 'dist');
  const existing = await lstat(dist).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  ensure(!existing || existing.isDirectory(), 'dist must be a directory, not a symlink or file.');
  await rm(dist, { recursive: true, force: true });
  for (const [file, content] of bundle) {
    await mkdir(dirname(join(dist, file)), { recursive: true });
    await writeFile(join(dist, file), content);
  }
  console.log(`Built ${bundle.size} public files in ${dist}`);
  console.log(`Home: ${normalizeBaseUrl(args[1])} | Travel tools: ${normalizeBaseUrl(args[1])}travel`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`Cloudflare build failed: ${error.message}`); process.exitCode = 1; });
}
