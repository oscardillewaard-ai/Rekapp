import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { expectedSw, appFiles } from '../tools/update-sw.mjs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('sw.js is bijgewerkt: bestandenlijst en versie kloppen (anders: node tools/update-sw.mjs)', () => {
  const sw = read('sw.js');
  assert.equal(sw, expectedSw(sw), 'draai node tools/update-sw.mjs');
});

test('de service worker cachet alles wat de app laadt, ook de bibliotheek, het schema en de iconen', () => {
  const files = appFiles();
  for (const f of ['./index.html', './manifest.webmanifest', './js/main.js', './data/library.json', './data/library.schema.json', './img/body.svg', './icons/icon-192.png']) {
    assert.ok(files.includes(f), f);
  }
  for (const f of files) if (f !== './') assert.ok(existsSync(new URL(`../${f.slice(2)}`, import.meta.url)), f);
});

test('manifest volgens §8.1: start_url en scope "./", standalone, nl, donker, iconen 192/512/maskable', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  assert.equal(m.lang, 'nl');
  assert.equal(m.background_color, '#000000');
  const sizes = m.icons.map((i) => `${i.sizes}:${i.purpose}`);
  assert.deepEqual(sizes, ['192x192:any', '512x512:any', '512x512:maskable']);
  for (const i of m.icons) assert.ok(existsSync(new URL(`../${i.src}`, import.meta.url)), i.src);
  const html = read('index.html');
  assert.ok(html.includes('rel="manifest"'));
  assert.ok(html.includes('apple-touch-icon-180.png'));
});
