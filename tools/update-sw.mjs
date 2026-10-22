// Werkt de lijst met bestanden en de versie in sw.js bij. De versie is een
// hash over de inhoud van al die bestanden: elke wijziging in de app geeft
// een nieuwe versie, en dus "Update beschikbaar" op de telefoon.
//
//   node tools/update-sw.mjs          bijwerken
//   node tools/update-sw.mjs --check  alleen controleren (exitcode 1 als het niet klopt)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// Wat de app nodig heeft (dezelfde mappen als de Pages-workflow publiceert).
export function appFiles() {
  const out = ['./', './index.html', './manifest.webmanifest'];
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir)).sort()) {
      const rel = `${dir}/${name}`;
      if (statSync(join(root, rel)).isDirectory()) walk(rel);
      else if (!name.startsWith('.') && name !== 'icon.svg') out.push(`./${rel}`);
    }
  };
  for (const dir of ['css', 'js', 'data', 'img', 'icons']) walk(dir);
  return out;
}

export function version(files) {
  const h = createHash('sha256');
  for (const f of files) {
    if (f === './') continue;
    h.update(f);
    h.update(readFileSync(join(root, f)));
  }
  return `v-${h.digest('hex').slice(0, 10)}`;
}

export function expectedSw(current) {
  const files = appFiles();
  return current
    .replace(/const VERSION = '[^']*';/, `const VERSION = '${version(files)}';`)
    .replace(/const FILES = \[[\s\S]*?\];/, `const FILES = [\n${files.map((f) => `  '${f}',`).join('\n')}\n];`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const path = join(root, 'sw.js');
  const current = readFileSync(path, 'utf8');
  const next = expectedSw(current);
  if (process.argv.includes('--check')) {
    if (next !== current) { console.error('sw.js is niet bijgewerkt: draai node tools/update-sw.mjs'); process.exit(1); }
    console.log('sw.js klopt');
  } else {
    writeFileSync(path, next);
    console.log(`sw.js bijgewerkt: ${appFiles().length} bestanden, ${version(appFiles())}`);
  }
}
