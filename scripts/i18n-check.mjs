// Translation check: every language file has exactly the keys of the default one (es.json),
// no empty texts, the same {{placeholders}} per key, and every literal key the code uses
// exists. Exit code 1 on any problem (CI runs it before the build).
//
//   npm run i18n:check
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = join(root, 'public/assets/i18n');
const DEFAULT = 'es';

const flatten = (obj, prefix = '', out = new Map()) => {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix + key;
    if (value && typeof value === 'object') flatten(value, `${path}.`, out);
    else out.set(path, value);
  }
  return out;
};
const placeholders = (text) =>
  [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

const load = (lang) => flatten(JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')));
const langs = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5));
const base = load(DEFAULT);
const problems = [];

for (const lang of langs) {
  const dict = load(lang);
  for (const [key, text] of dict) {
    if (typeof text !== 'string' || !text.trim()) problems.push(`${lang}: empty text  ${key}`);
  }
  if (lang === DEFAULT) continue;
  for (const [key, text] of base) {
    if (!dict.has(key)) problems.push(`${lang}: missing  ${key}`);
    else if (placeholders(text) !== placeholders(dict.get(key))) {
      problems.push(
        `${lang}: placeholders differ  ${key}  (${placeholders(text)} vs ${placeholders(dict.get(key))})`,
      );
    }
  }
  for (const key of dict.keys())
    if (!base.has(key)) problems.push(`${lang}: not in ${DEFAULT}  ${key}`);
}

// Literal keys in the code ('pages.stats.title', titleKey="charts.empty"). Keys built at runtime
// ('exercises.muscles.' + m) can't be checked statically; their prefixes must exist.
const prefixes = new Set([...base.keys()].map((k) => k.split('.')[0]));
const files = [];
const walk = (d) => {
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    const path = join(d, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'api') walk(path);
    } else if (/\.(ts|html)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
      files.push(path);
    }
  }
};
walk(join(root, 'src/app'));
const groups = new Set(
  [...base.keys()].flatMap((k) =>
    k
      .split('.')
      .slice(0, -1)
      .map((_, i, a) => a.slice(0, i + 1).join('.')),
  ),
);
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const [, key] of source.matchAll(/['"`]([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_-]+)+)\.?['"`]/g)) {
    if (!prefixes.has(key.split('.')[0])) continue;
    // A group used as a prefix (e.g. a messages prefix) is fine; a leaf must exist.
    if (!base.has(key) && !groups.has(key)) {
      problems.push(`code: unknown key  ${key}  (${relative(root, file)})`);
    }
  }
}

if (problems.length) {
  console.error(`i18n: ${problems.length} problem(s)\n` + problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log(`i18n: ${langs.join(', ')} in sync (${base.size} keys).`);
