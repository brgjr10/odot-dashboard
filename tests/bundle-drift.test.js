import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// This is the regression guard for ODOT-A-001 / ODOT-I-001: bundle.js used to be a
// hand-maintained artifact nothing could regenerate, and it silently drifted away
// from the source modules. Now that src/app.js is the source of truth and bundle.js
// is `npm run build` output, a stale commit has to fail here.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(repoRoot, 'src', 'app.js');
const bundlePath = path.join(repoRoot, 'bundle.js');

const source = readFileSync(sourcePath, 'utf8');
const bundle = readFileSync(bundlePath, 'utf8');

// Top-level declarations are the symbols a reader greps for to work out whether
// the shipped file matches the source.
function topLevelNames(code) {
  const names = new Set();
  const re = /^\s{2,4}(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  let match;
  while ((match = re.exec(code)) !== null) {
    names.add(match[1]);
  }
  return [...names];
}

describe('bundle.js is generated from src/app.js', () => {
  it('exists and is non-trivial', () => {
    expect(existsSync(bundlePath)).toBe(true);
    expect(bundle.length).toBeGreaterThan(1000);
  });

  it('contains every top-level symbol declared in the source', () => {
    const names = topLevelNames(source);
    expect(names.length).toBeGreaterThan(30);

    const missing = names.filter((name) => !bundle.includes(name));
    expect(missing, `bundle.js is stale: missing ${missing.join(', ')} - run npm run build`).toEqual([]);
  });

  it('carries the fixes that were made to the source', () => {
    // Each of these was a QA finding fixed in src/app.js. If the bundle predates
    // the fix, the user gets the old behaviour with no other signal.
    const fixedInSource = [
      'migrateSettings',
      'isAllowedCameraUrl',
      'formatDateTime',
      'fetchWithTimeout',
      'CAMERA_ERROR_COOLDOWN_MS',
      'serviceWorker'
    ];

    const missing = fixedInSource.filter((name) => !bundle.includes(name));
    expect(missing, `bundle.js is stale: missing ${missing.join(', ')} - run npm run build`).toEqual([]);
  });

  it('is loaded by index.html and is the only script the page loads', () => {
    const html = readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)].map((m) => m[1]);

    expect(scripts).toEqual(['./bundle.js']);
  });

  it('has a service worker precache list matching the scripts the page loads', () => {
    const sw = readFileSync(path.join(repoRoot, 'sw.js'), 'utf8');
    const assets = [...sw.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]);

    expect(assets).toContain('bundle.js');
    expect(assets).toContain('index.html');
    // The dead module tree must not come back.
    for (const orphan of ['app.js', 'cameras.js', 'weather.js', 'storage.js', 'time.js', 'defaults.js']) {
      expect(assets).not.toContain(orphan);
    }
  });
});