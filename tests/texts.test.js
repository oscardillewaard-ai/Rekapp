import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RUBRICS, BREATHING, CARD, FILTERS } from '../js/texts.js';
import { WARNINGS } from '../js/warnings.js';

// Elke vaste tekst in de app moet letterlijk in de spec staan.
const spec = readFileSync(new URL('../rekapp-spec-v2.md', import.meta.url), 'utf8').replace(/\s+/g, ' ');
const inSpec = (text, where) => assert.ok(spec.includes(text.replace(/\s+/g, ' ')), `${where} staat niet letterlijk in de spec: "${text}"`);

test('rubrieken uit §3.1 staan letterlijk in de spec', () => {
  for (const [letter, r] of Object.entries(RUBRICS)) {
    inSpec(`**${r.title}**${r.intro ? ` ${r.intro}` : ''}`, `${letter}: titel en intro`);
    for (const [level, text] of Object.entries(r.levels)) inSpec(`| ${level} | ${text} |`, `${letter}${level}`);
    if (r.outro) inSpec(r.outro, `${letter}: slot`);
  }
});

test('ademcues uit §6.2 staan letterlijk in de spec', () => {
  for (const [type, text] of Object.entries(BREATHING)) inSpec(text, `ademcue ${type}`);
});

test('kaart- en filterteksten uit §6.1–6.2 staan letterlijk in de spec', () => {
  for (const [k, text] of Object.entries({ ...CARD, ...FILTERS })) inSpec(text, k);
});

test('waarschuwingen W1–W9 uit §6.5 staan letterlijk in de spec', () => {
  for (const [code, w] of Object.entries(WARNINGS)) {
    inSpec(`| ${code} | ${w.severity} |`, `${code} ernst`);
    inSpec(`"${w.text}"`, `${code} tekst`);
  }
});
