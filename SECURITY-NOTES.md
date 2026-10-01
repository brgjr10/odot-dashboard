# Security notes and commit-message corrections

## Correction: `a65b1f8` describes the app:// guard as "unchanged"

`a65b1f8` ("Upgrade Electron 26.6.10 -> 44.5.1 and migrate app:// to
protocol.handle") contains this claim:

> The `ALLOWED_APP_FILES` list and the `__dirname` containment check are
> unchanged and still gate every request; only the mechanism underneath them
> moved.

**That is not accurate. Both are new in `a65b1f8`.** Neither existed before it.

Evidence:

```console
$ git log -S "ALLOWED_APP_FILES" --oneline -- main.js
a65b1f8 Upgrade Electron 26.6.10 -> 44.5.1 and migrate app:// to protocol.handle
```

The only commit returned is `a65b1f8` itself, so the symbol is introduced there
rather than carried over.

The handler as it stood at `fa5bd7d` (the commit before) was:

```js
protocol.registerFileProtocol('app', (request, callback) => {
  const url = new URL(request.url);
  let pathname = url.pathname;
  // ... default the empty path ...
  const filePath = path.join(__dirname, pathname);
  callback({ path: filePath });
});
```

There is no allow-list and no containment check anywhere in that version. It
resolved the requested pathname against `__dirname` and handed the result
straight to the callback, so **any file under the app directory was servable over
`app://`**, including `.git/config`, `.git/**`, `package.json`,
`package-lock.json` and `node_modules/**` during a dev run. `path.join` does
normalise `..` segments, but it normalises them rather than refusing them, so a
path that normalised back inside `__dirname` was not distinguished from one that
did not.

### Why this matters to keep on the record

The code is materially **better** than the message claims: `a65b1f8` closed a
real directory-traversal / information-disclosure hole rather than merely
re-homing an existing guard. The risk is that the message implies the security
property was pre-existing and merely preserved, which understates the severity
of the original defect and makes the fix look like a routine deprecation
migration. In a security campaign that misreading matters: it changes how a
reviewer judges the residual risk and whether a regression here is "losing a
control" or "never having had one to begin with".

### Not rewritten

`a65b1f8` has deliberately **not** been amended, rebased or otherwise rewritten.
It is unpushed, so the owner may still amend it themselves; doing so is their
call, not this note's. If it is amended, delete this section.

To correct the message in place, the owner would run:

```console
$ git rebase -i fa5bd7d
```

and reword the `a65b1f8` message so the guard is described as **introduced** by
that commit rather than unchanged.

## The `app://` allow-list, as shipped

`main.js` defines the only files servable over `app://`:

```js
const ALLOWED_APP_FILES = new Set([
  '/index.html',
  '/bundle.js',
  '/app.css',
  '/manifest.webmanifest',
  '/icon.png'
]);
```

The handler answers an explicit 403 from `ALLOWED_APP_FILES.has(pathname)`
*before* `path.join(__dirname, pathname)` and before `net.fetch`, and keeps the
`filePath.startsWith(__dirname + path.sep)` containment check as defence in
depth.

`tests/main-protocol-guard.test.js` locks both halves of that down: it asserts the
sensitive paths are absent from the allow-list, and asserts the ordering of the
guard relative to the filesystem read. Moving the check to after `net.fetch` still
satisfies a naive "does the guard exist" test but reads the file first, so the
test compares source indexes instead. That behaviour was confirmed by mutation.

### Open question: `sw.js` is not on the `app://` allow-list

`src/app.js:1567` registers the service worker on any non-`file:` protocol:

```js
if ("serviceWorker" in window && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("[odot] service worker registration failed; the dashboard still works online.", err);
    });
  });
}
```

Under `run_server.py` and a plain browser the protocol is `http:`, so `./sw.js` is
served from `ALLOWED_FILES` and registration succeeds. Under the packaged
Electron app the protocol is `app:`, which passes the `!== "file:"` test, so the
renderer *does* request `app://-/sw.js` — and `/sw.js` is **not** in
`ALLOWED_APP_FILES`, so the handler answers 403.

The consequence is limited, because the registration is wrapped in a `.catch`
that logs a warning: the dashboard still runs, it simply has no offline shell in
the packaged app. But it is an asymmetry worth resolving deliberately rather than
by accident. Two options, both of which change behaviour rather than just
documentation:

1. Add `/sw.js` to `ALLOWED_APP_FILES` so the packaged app gets the same offline
   shell as the served app.
2. Skip registration for the `app:` scheme, so the packaged app does not make a
   request it is always going to be refused.

This has deliberately **not** been done here: `ALLOWED_APP_FILES` is explicitly
frozen by the current task, and both options need the owner's call.

## Packaging

The electron-builder `files` array excludes `project.json` (owner WIP, never
tracked), `.github/**`, `Dockerfile`, `docker-compose.yml`, `*.py`,
`.qa-tmp/**`, `.env*` and `__pycache__/**`, so those files are not shipped inside
`app.asar`. This is about what ships in the distributable; `ALLOWED_APP_FILES`
governs what the running app will serve over `app://` and is a separate
concern.