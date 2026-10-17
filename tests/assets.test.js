import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { lib } from './helpers.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const VIEWS = new Set(['voor', 'achter', 'beide']);

// Gedeelde regels voor alle eigen SVG's: zelfstandig, geen scripts, geen
// externe verwijzingen, geen tekst (labels komen uit de app).
function assertCleanSvg(svg, name) {
  assert.match(svg, /^<svg\s[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${name}: begint met <svg xmlns=…>`);
  assert.doesNotMatch(svg, /<script|<foreignObject|<style|<text|<image/i, `${name}: geen script, style, text of image`);
  assert.doesNotMatch(svg, /(?:href|src)\s*=\s*"(?!#)/i, `${name}: geen externe verwijzingen`);
  assert.doesNotMatch(svg, /\son[a-z]+\s*=/i, `${name}: geen event-attributen`);
}

test('lichaamskaart: 24 regio\'s met id = groeps-id, plus het silhouet (§6.2)', () => {
  const svg = read('img/body.svg');
  assertCleanSvg(svg, 'body.svg');
  assert.match(svg, /viewBox="0 0 200 240"/);
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const groupIds = [...lib.groups.keys()];
  assert.deepEqual([...ids].sort(), [...groupIds, 'silhouet'].sort(), 'precies het silhouet en de 24 groeps-id\'s');

  for (const id of groupIds) {
    const m = new RegExp(`<g\\s([^>]*\\bid="${id}"[^>]*)>([\\s\\S]*?)</g>`).exec(svg);
    assert.ok(m, `regio ${id} is een <g>`);
    const attrs = m[1];
    assert.match(attrs, /\bclass="regio"/, `${id}: class="regio"`);
    const view = /\bdata-view="([^"]+)"/.exec(attrs)?.[1];
    assert.ok(VIEWS.has(view), `${id}: data-view is voor, achter of beide`);
    const shapes = m[2].match(/<(path|ellipse|circle|polygon|rect)\b[^>]*>/g) ?? [];
    assert.ok(shapes.length >= 1, `${id}: minstens één vorm`);
    for (const s of shapes) assert.doesNotMatch(s, /\bfill=/, `${id}: kleur staat op de <g>, niet op de vormen`);
  }
  assert.ok(Buffer.byteLength(svg) < 40_000, 'kleiner dan 40 kB');
});

test('positie-iconen: staand, stoel, vloer, liggend (§6.2)', () => {
  const positions = new Set([...lib.exercises.values()].map((x) => x.position));
  assert.deepEqual([...positions].sort(), ['liggend', 'staand', 'stoel', 'vloer']);
  for (const p of positions) {
    const path = `img/pos/${p}.svg`;
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} bestaat`);
    const svg = read(path);
    assertCleanSvg(svg, path);
    assert.match(svg, /viewBox="0 0 48 48"/, `${path}: viewBox 0 0 48 48`);
    assert.match(svg, /stroke="currentColor"/, `${path}: lijnkleur volgt de tekstkleur`);
    assert.doesNotMatch(svg, /\sid="/, `${path}: geen id's`);
  }
});
