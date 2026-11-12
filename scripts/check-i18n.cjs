#!/usr/bin/env node
/**
 * i18n guard: fails when a translation key referenced by the frontend is
 * missing from en.json or es.json.
 *
 * Covered sources:
 *  - Every static `t('key')` / `t("key")` call in frontend/src.
 *  - Every labelKey/descKey/sectionKey/extraKeys entry in
 *    settingsSearchIndex.ts (the Settings search index resolves labels
 *    through i18n without going through t()).
 *  - The sidebar tab labels map (SETTINGS_TAB_LABEL_KEYS values).
 *
 * Dynamic keys built at runtime (achievement ids, clip types, theme names)
 * are not enumerable here; they are validated manually.
 *
 * de/fr/ja/zh are intentionally partial (fallbackLng: 'en') and are not
 * checked. The script only reads files; run it with `npm run i18n:check`.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'frontend', 'src');
const localesDir = path.join(root, 'frontend', 'src', 'i18n', 'locales');
const LOCALES = ['en', 'es'];

const STATIC_KEY_RE = /\bt\(\s*['"]([a-zA-Z][a-zA-Z0-9_.-]*)['"]\s*[,)]/g;
const INDEX_ENTRY_RE = /(?:labelKey|descKey|sectionKey):\s*'([^']+)'/g;
const INDEX_EXTRA_RE = /extraKeys:\s*\[([^\]]*)\]/g;
const TAB_LABEL_RE = /(?:general|clipboard|notifications|compact|full|security|folders|ai|maintenance|achievements):\s*'([^']+)'/g;

function flatten(value, prefix = '', acc = new Set()) {
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') {
      flatten(child, `${prefix}${key}.`, acc);
    } else {
      acc.add(`${prefix}${key}`);
    }
  }
  return acc;
}

function* sourceFiles(dir, extensions) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(full, extensions);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      yield full;
    }
  }
}

function collectUsedKeys() {
  const used = new Set();
  for (const file of sourceFiles(srcDir, ['.ts', '.tsx'])) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(STATIC_KEY_RE)) {
      used.add(match[1]);
    }
    if (file.endsWith('settingsSearchIndex.ts')) {
      for (const match of source.matchAll(INDEX_ENTRY_RE)) {
        used.add(match[1]);
      }
      for (const match of source.matchAll(INDEX_EXTRA_RE)) {
        for (const extra of match[1].matchAll(/'([^']+)'/g)) {
          used.add(extra[1]);
        }
      }
      for (const match of source.matchAll(TAB_LABEL_RE)) {
        used.add(match[1]);
      }
    }
  }
  return used;
}

function main() {
  const used = collectUsedKeys();
  let failed = false;
  for (const locale of LOCALES) {
    const file = path.join(localesDir, `${locale}.json`);
    let available;
    try {
      available = flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (error) {
      console.error(`i18n:check: cannot parse ${locale}.json: ${error.message}`);
      failed = true;
      continue;
    }
    const missing = [...used].filter((key) => !available.has(key)).sort();
    if (missing.length > 0) {
      console.error(`i18n:check: ${missing.length} key(s) missing in ${locale}.json:`);
      for (const key of missing) {
        console.error(`  - ${key}`);
      }
      failed = true;
    } else {
      console.log(`i18n:check: ${locale}.json covers all ${used.size} referenced keys`);
    }
  }
  if (failed) {
    process.exitCode = 1;
  }
}

main();
