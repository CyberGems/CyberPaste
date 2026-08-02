/**
 * Extract release notes for a given version from CHANGELOG.md and write them
 * to RELEASE_NOTES.txt for use by GitHub Releases.
 *
 * Usage: node scripts/extract-release-notes.js <version-or-ref>
 *
 * Behaviour:
 * - Accepts "1.6.0" or "v1.6.0"
 * - Matches headings like "## [1.6.0] — 2026-08-01" or "## 1.6.0 — ..."
 * - Always exits 0 — falls back to "Release <version>" if no section matches
 */
import fs from 'node:fs';
import path from 'node:path';

const rawRef = process.argv[2] || process.env.GITHUB_REF_NAME || '';
const version = String(rawRef).replace(/^v/, '');
const outPath = path.resolve(process.cwd(), 'RELEASE_NOTES.txt');

let notes = `Release ${rawRef || version}`;

try {
  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    const content = fs.readFileSync(changelogPath, 'utf8');
    const lines = content.split(/\r?\n/);

    // Find the heading line, e.g. "## [1.6.0] — ..." or "## 1.6.0 — ..."
    const headingPattern = new RegExp(
      '^##\\s+(?:\\[)?' + version.replace(/\./g, '\\.') + '(?:\\])?(?:\\s|$|[—–-])'
    );
    const headingIdx = lines.findIndex((line) => headingPattern.test(line));

    if (headingIdx >= 0) {
      let end = lines.length;
      for (let i = headingIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## ') && !lines[i].startsWith('###')) {
          end = i;
          break;
        }
      }
      const captured = lines.slice(headingIdx + 1, end).join('\n').trim();
      if (captured) {
        notes = captured;
      }
    }
  }
} catch (err) {
  console.warn('CHANGELOG extraction failed:', err.message);
}

fs.writeFileSync(outPath, notes, 'utf8');
console.log('Release notes written to', outPath, `(${notes.length} chars)`);
