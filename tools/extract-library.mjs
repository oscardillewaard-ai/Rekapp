// Haalt twee bestanden letterlijk uit de spec en controleert dat het geldige
// JSON is:
// - data/library.json: alles tussen <!-- LIBRARY_JSON_START --> en
//   <!-- LIBRARY_JSON_END --> (§10), zonder de codeblokmarkering;
// - data/library.schema.json: het JSON-codeblok onder "### 9.1 Schema".
//
// Gebruik: node tools/extract-library.mjs [spec.md]
import { readFileSync, writeFileSync } from 'node:fs';

const specPath = process.argv[2] ?? 'rekapp-spec-v2.md';
const lines = readFileSync(specPath, 'utf8').split('\n');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function stripFence(body) {
  if (/^```(json)?\s*$/.test(body[0] ?? '')) body = body.slice(1);
  if (/^```\s*$/.test(body[body.length - 1] ?? '')) body = body.slice(0, -1);
  return body;
}

function write(outPath, body) {
  const text = body.join('\n') + '\n';
  try {
    JSON.parse(text);
  } catch (e) {
    fail(`${outPath}: geen geldige JSON: ${e.message}`);
  }
  writeFileSync(outPath, text);
  console.log(`${outPath}: ${body.length} regels, ${Buffer.byteLength(text)} bytes, geldige JSON.`);
}

const start = lines.findIndex((l) => l.trim() === '<!-- LIBRARY_JSON_START -->');
const end = lines.findIndex((l) => l.trim() === '<!-- LIBRARY_JSON_END -->');
if (start < 0 || end < 0 || end <= start) {
  fail('Markeringen LIBRARY_JSON_START/END niet gevonden of in de verkeerde volgorde.');
}
write('data/library.json', stripFence(lines.slice(start + 1, end)));

const heading = lines.findIndex((l) => l.trim() === '### 9.1 Schema');
const open = lines.findIndex((l, i) => i > heading && /^```json\s*$/.test(l));
const close = lines.findIndex((l, i) => i > open && /^```\s*$/.test(l));
if (heading < 0 || open < 0 || close < 0) fail('Schemablok onder "### 9.1 Schema" niet gevonden.');
write('data/library.schema.json', lines.slice(open + 1, close));
