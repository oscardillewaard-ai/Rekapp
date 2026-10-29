import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RUBRICS, RUBRICS_TRAINING, BREATHING, CARD, FILTERS, KNEE, SELFTEST, ABOUT, STARS_FORMULA, STARS_MEANING, STARS_NO_KNEE, INSTALL } from '../js/texts.js';
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

test('B- en D-rubriek voor training uit §3.1 staan letterlijk in de spec', () => {
  for (const [letter, r] of Object.entries(RUBRICS_TRAINING)) {
    inSpec(`**${r.title}** ${r.intro}`, `${letter} training: titel en intro`);
    for (const [level, text] of Object.entries(r.levels)) inSpec(`| ${level} | ${text} |`, `${letter}${level} training`);
  }
});

test('ademcues uit §6.2 staan letterlijk in de spec', () => {
  for (const [type, text] of Object.entries(BREATHING)) inSpec(text, `ademcue ${type}`);
});

test('kaart- en filterteksten uit §6.1–6.2 staan letterlijk in de spec', () => {
  for (const [k, text] of Object.entries({ ...CARD, ...FILTERS })) inSpec(text, k);
});

test('teksten van de zelftests uit §6.10 staan letterlijk in de spec', () => {
  for (const [k, text] of Object.entries(SELFTEST)) inSpec(text, k);
});

test('"Over" (§6.12), de sterren (§3.2–3.3) en installeren (§7) staan letterlijk in de spec', () => {
  for (const t of ABOUT) inSpec(`- ${t}`, t);
  for (const t of STARS_FORMULA) inSpec(t, t);
  for (const [lead, rest] of STARS_MEANING) inSpec(`- **${lead}** ${rest}`, lead);
  for (const t of Object.values(INSTALL)) inSpec(t, t);
});

test('de sterren zonder Kniefuncties (§6.11) staan letterlijk in de spec', () => {
  inSpec(STARS_NO_KNEE.intro, 'intro');
  for (const t of STARS_NO_KNEE.formula) inSpec(t, t);
  for (const [lead, rest] of STARS_NO_KNEE.meaning) inSpec(`- **${lead}** ${rest}`, lead);
});

test('knieteksten uit §6.6–6.7 en §6.11 staan letterlijk in de spec', () => {
  for (const [k, text] of Object.entries(KNEE)) inSpec(text, k);
});

test('waarschuwingen uit §6.5 staan letterlijk in de spec', () => {
  for (const [code, w] of Object.entries(WARNINGS)) {
    inSpec(`| ${code} | ${w.severity} |`, `${code} ernst`);
    inSpec(`"${w.text}"`, `${code} tekst`);
  }
});
