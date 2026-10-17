// Haalt data/library.json letterlijk uit §10 van de spec: alles tussen
// <!-- LIBRARY_JSON_START --> en <!-- LIBRARY_JSON_END -->, zonder de
// codeblokmarkering. Controleert daarna dat het geldige JSON is.
//
// Gebruik: node tools/extract-library.mjs [spec.md] [uit.json]
import { readFileSync, writeFileSync } from 'node:fs';

const specPath = process.argv[2] ?? 'rekapp-spec-v2.md';
const outPath = process.argv[3] ?? 'data/library.json';

const lines = readFileSync(specPath, 'utf8').split('\n');
const start = lines.findIndex((l) => l.trim() === '<!-- LIBRARY_JSON_START -->');
const end = lines.findIndex((l) => l.trim() === '<!-- LIBRARY_JSON_END -->');
if (start < 0 || end < 0 || end <= start) {
  console.error('Markeringen LIBRARY_JSON_START/END niet gevonden of in de verkeerde volgorde.');
  process.exit(1);
}

let body = lines.slice(start + 1, end);
if (/^```(json)?\s*$/.test(body[0] ?? '')) body = body.slice(1);
if (/^```\s*$/.test(body[body.length - 1] ?? '')) body = body.slice(0, -1);
const text = body.join('\n') + '\n';

try {
  JSON.parse(text);
} catch (e) {
  console.error(`Geen geldige JSON: ${e.message}`);
  process.exit(1);
}

writeFileSync(outPath, text);
console.log(`${outPath}: ${body.length} regels, ${Buffer.byteLength(text)} bytes, geldige JSON.`);
