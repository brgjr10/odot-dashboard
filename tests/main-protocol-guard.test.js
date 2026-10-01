import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// main.js had no test coverage at all, yet the app:// allow-list is the entire
// point of the protocol.handle migration: the old registerFileProtocol handler
// served any file under __dirname, so /.git/config was reachable over app://.
// These are source-level assertions, because main.js cannot be imported without
// launching an Electron runtime.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainPath = path.join(repoRoot, 'main.js');

const source = readFileSync(mainPath, 'utf8');

// Comments are stripped for the "is this actually called?" assertions: main.js
// mentions registerFileProtocol in a comment explaining why it was replaced, and
// a naive substring check would flag that explanation as a live call.
const code = source.replace(/^\s*\/\/.*$/gm, '');

const setMatch = code.match(/const\s+ALLOWED_APP_FILES\s*=\s*new\s+Set\(\s*\[([\s\S]*?)\]\s*\)/);
const allowList = setMatch ? [...setMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

// The handler is the arrow function body passed to protocol.handle, from the
// first brace after "=>" to its matching close.
function handlerBody() {
  const handle = code.indexOf('protocol.handle(');
  expect(handle, 'main.js no longer registers app:// via protocol.handle').toBeGreaterThanOrEqual(0);
  const arrow = code.indexOf('=>', handle);
  const open = code.indexOf('{', arrow);
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    else if (code[i] === '}') {
      depth -= 1;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  throw new Error('unterminated protocol.handle body');
}

const handler = handlerBody();

describe('main.js app:// allow-list exists', () => {
  it('declares ALLOWED_APP_FILES and it is not empty', () => {
    expect(source).toContain('ALLOWED_APP_FILES');
    expect(setMatch, 'ALLOWED_APP_FILES must be a Set literal').not.toBeNull();
    expect(allowList.length).toBeGreaterThan(0);
  });

  it('does not expose any sensitive path', () => {
    // Each of these is readable from inside the app directory and must not be
    // servable over app://. A regression here reopens the exact hole the
    // protocol.handle migration closed.
    for (const forbidden of ['.git/config', 'project.json', 'package.json', 'run_server.py', 'main.js']) {
      expect(allowList, `ALLOWED_APP_FILES must not contain ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('serves only leading-slash paths, so a bare or relative name cannot match', () => {
    // The handler compares against url.pathname, which is always slash-prefixed,
    // so a non-prefixed entry would be dead code and a real hole to widen later.
    for (const entry of allowList) {
      expect(entry.startsWith('/'), `${entry} must start with /`).toBe(true);
    }
  });

  it('still serves the assets the packaged app depends on', () => {
    // Guards against the opposite failure: tightening the list so far that the
    // packaged app no longer boots.
    for (const required of ['/index.html', '/bundle.js']) {
      expect(allowList).toContain(required);
    }
  });
});

describe('main.js checks the allow-list before touching the filesystem', () => {
  it('registers app:// through protocol.handle, not the deprecated API', () => {
    expect(code).toContain("protocol.handle('app'");
    expect(code).not.toContain('registerFileProtocol');
    expect(code).not.toContain('registerHttpProtocol');
  });

  it('guards on ALLOWED_APP_FILES.has(pathname) before any read', () => {
    const guard = handler.indexOf('ALLOWED_APP_FILES.has(pathname)');
    const denial = handler.indexOf('status: 403');
    const join = handler.indexOf('path.join(__dirname');
    const fetch = handler.indexOf('net.fetch');

    expect(guard, 'the allow-list check must exist in the handler').toBeGreaterThanOrEqual(0);
    expect(denial, 'the handler must answer 403 when the check fails').toBeGreaterThanOrEqual(0);
    expect(join, 'the handler must resolve a path from __dirname').toBeGreaterThanOrEqual(0);
    expect(fetch, 'the handler must fetch the file via net.fetch').toBeGreaterThanOrEqual(0);

    // The ordering is the security property. A guard placed after path.join or
    // after net.fetch would still satisfy a has() test but would read first.
    expect(guard).toBeLessThan(denial);
    expect(denial).toBeLessThan(join);
    expect(join).toBeLessThan(fetch);
  });

  it('keeps the __dirname containment check as defence in depth', () => {
    expect(handler).toContain('filePath.startsWith(__dirname + path.sep)');
  });
});