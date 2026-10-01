import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ODOT-PY-001: run_server.py bound 0.0.0.0 and served the whole repository, so
// /.git/config and /node_modules/ answered 200 to anyone on the LAN.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function waitForServer(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    const tryOnce = (left) => {
      fetch(url)
        .then(() => resolve())
        .catch((err) => {
          if (left <= 0) reject(err);
          else setTimeout(() => tryOnce(left - 1), 250);
        });
    };
    tryOnce(attempts);
  });
}

let server;
let origin;

beforeAll(async () => {
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  server = spawn('python', ['run_server.py', '--port', String(port), '--no-open'], {
    cwd: repoRoot,
    stdio: 'ignore'
  });
  await waitForServer(`${origin}/`);
}, 30000);

afterAll(() => {
  if (server) server.kill();
});

describe('run_server.py served surface', () => {
  it('refuses .git, .env and node_modules', async () => {
    const denied = [
      '/.git/config',
      '/.git/HEAD',
      '/.env',
      '/.env.local',
      '/node_modules/',
      '/node_modules/electron/package.json',
      '/.github/workflows/docker-publish.yml',
      '/package-lock.json',
      '/run_server.py',
      '/project.json'
    ];

    for (const path of denied) {
      const res = await fetch(origin + path);
      expect(res.status, `${path} should be refused`).toBe(403);
      expect(await res.text()).not.toMatch(/github|core\.gitignore|dependencies/);
    }
  });

  it('refuses directory listings and traversal', async () => {
    // "/.." and "/../" are not here on purpose: WHATWG URL normalisation collapses
    // them to "/" in the client before they are ever sent.
    for (const path of ['/../../../../etc/passwd', '/%2e%2e%2f%2e%2e%2fetc/passwd', '/src/app.js', '/node_modules']) {
      const res = await fetch(origin + path);
      expect(res.status, `${path} should be refused`).toBe(403);
    }
  });

  it('still serves the dashboard', async () => {
    const res = await fetch(`${origin}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('odot-dashboard');

    for (const asset of ['/bundle.js', '/app.css', '/sw.js', '/manifest.webmanifest', '/icon.png']) {
      const r = await fetch(origin + asset);
      expect(r.status, `${asset} should be served`).toBe(200);
    }
  });

  it('sends the security headers', async () => {
    const res = await fetch(`${origin}/`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('cache-control')).toContain('no-store');
  });
});