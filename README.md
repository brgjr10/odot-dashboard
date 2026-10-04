# ODOT Camera Dashboard + Weather

[![Docker Pulls](https://img.shields.io/docker/pulls/brgjr10/odot-dashboard?logo=docker&style=flat)](https://hub.docker.com/repository/docker/brgjr10/odot-dashboard)
[![Docker Image](https://img.shields.io/docker/v/brgjr10/odot-dashboard/latest?logo=docker&style=flat)](https://hub.docker.com/repository/docker/brgjr10/odot-dashboard/general)
[![GitHub release](https://img.shields.io/github/v/release/brgjr10/odot-dashboard?logo=github&style=flat)](https://github.com/brgjr10/odot-dashboard/releases)
[![GitHub Packages](https://img.shields.io/badge/ghcr.io-odot--dashboard-blue?logo=github&style=flat)](https://github.com/brgjr10/odot-dashboard/packages)

Interactive single-page app version of your Tampermonkey dashboard:

- ODOT camera tiles with per-camera ALT and a global Alt all
- Fullscreen viewer for any camera (auto-refresh + zoom)
- Weather sidebar (OpenWeather Current Weather)
- Pain/migraine risk + driving risk summaries
- Traffic alerts (OHGO Public API)
- Settings (API keys, coords/geolocation, refresh intervals, camera list)

<img width="1280" height="640" alt="image" src="https://github.com/user-attachments/assets/0ffa7048-7c39-4806-b282-656ca42b9e29" />

## Quick start (recommended)

Run a local server from the `odot-dashboard` folder:

### Option A: PowerShell

```powershell
cd odot-dashboard
powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 5173
```

### Option B: Python

```powershell
cd odot-dashboard
python .\run_server.py --port 5173
```

Then open:

- http://localhost:5173

`run_server.py` binds `127.0.0.1` by default and serves an allow-list of dashboard
files only (`.git`, `.env`, `node_modules`, lockfiles and anything else answer 403).
Pass `--host 0.0.0.0` if you deliberately want it on the LAN.

## Working on the UI

`index.html` loads one script, `bundle.js`, and `bundle.js` is generated output.

```powershell
npm install
npm run build   # rebuilds bundle.js from src/app.js
npm test        # vitest: bundle-freshness guard + served-surface guard
npm run test:python
```

Edit `src/app.js`, never `bundle.js`. `tests/bundle-drift.test.js` fails if the
committed `bundle.js` no longer contains the source symbols, so a stale build
cannot be committed unnoticed.

## Run as a desktop app

This repo can also be packaged as a Windows executable using Electron.

1. Install Node.js if you do not already have it.
2. In the `odot-dashboard` folder run:

```powershell
npm install
npm run build
npm run start
```

`main.js` calls `app.disableHardwareAcceleration()`, so the app also runs on
headless hosts, VMs and RDP sessions that have no usable GPU.

3. To create a distributable EXE installer:

```powershell
npm install
npm run package
```

The built output will be in `dist`.

## Configure weather

1. Click Settings
2. Paste your OpenWeather API key
3. Save

Note: this is a static app, so the key is stored in localStorage and is visible to anyone who can read your browser storage.
