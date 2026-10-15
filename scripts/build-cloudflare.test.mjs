import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { normalizeBaseUrl, createBundle, transformHome, transformTools, transformData, transformApp } from './build-cloudflare.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const text = file => readFile(`${root}/${file}`, 'utf8');
const base = 'https://season-atlas.ryuya-suginaka.workers.dev/';

test('requires a plain public HTTPS origin', () => {
  assert.equal(normalizeBaseUrl(base.slice(0, -1)), base);
  for (const url of [undefined, '', 'http://example.com', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com/?x=1', 'https://localhost', 'https://127.0.0.1', 'https://example.com:443', 'https://-example.com']) {
    assert.throws(() => normalizeBaseUrl(url));
  }
});

test('public bundle has exactly its allowlisted files and correct routes', async () => {
  const bundle = await createBundle(root, base);
  assert.equal(bundle.size, 21);
  assert.deepEqual([...bundle.keys()].filter(path => /\.(md|json|map)$|^docs\/|^\.|profile-placeholder/.test(path)), []);
  assert.match(bundle.get('index.html'), /href="travel\.html#roulette"/);
  assert.match(bundle.get('index.html'), new RegExp(`rel="canonical" href="${base.replaceAll('.', '\\.')}"`));
  assert.match(bundle.get('travel.html'), /workers\.dev\/travel"/);
  assert.match(bundle.get('js/config.js'), /workers\.dev\/'/);
  assert.equal((bundle.get('sitemap.xml').match(/<loc>/g) || []).length, 2);
  assert.doesNotMatch(bundle.get('index.html'), /noindex|プレビュー/);
  assert.doesNotMatch(bundle.get('travel.html'), /旅の記録|trips-section|profile-card/);
  assert.match(bundle.get('index.html'), /AI 生成/);
});

test('removes personal data while preserving public destination and planning data exactly', async () => {
  const before = await text('js/data.js');
  const after = transformData(before);
  const publicData = 'JSON.stringify({ DATA, MODEL_PLAN, TRAVEL_TIPS })';
  assert.equal(runInNewContext(`${before}\n${publicData}`), runInNewContext(`${after}\n${publicData}`));
  assert.equal(runInNewContext(`${after}\ntypeof PROFILE`), 'undefined');
  assert.equal(runInNewContext(`${after}\ntypeof TRIP_RECORDS`), 'undefined');
});

test('fails closed if personal-data boundaries or render initialization drift', async () => {
  const data = await text('js/data.js');
  const app = await text('js/app.js');
  const tools = await text('index.html');
  assert.throws(() => transformData(data.replace('旅の記録・プロフィール', '変更した見出し')));
  assert.throws(() => transformData(`${data}\nconst MORE_PRIVATE_DATA = {};\n`));
  assert.throws(() => transformApp(app.replace('renderTrips();', 'renderTrips(1);')));
  assert.throws(() => transformTools(tools.replace('<!-- TRIP RECORDS & PROFILE -->', '<!-- changed -->'), base));
});

test('fails loudly when preview copy or expected homepage links change', async () => {
  const home = await text('home.html');
  assert.throws(() => transformHome(home.replace('noindex, nofollow', 'noindex'), base));
  assert.throws(() => transformHome(home.replace('index.html#roulette', 'other.html#roulette'), base));
});
