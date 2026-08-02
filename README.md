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

<img width="1241" height="833" alt="image" src="https://github.com/user-attachments/assets/0ba9bc80-fbe2-4043-8982-9761de58232b" />

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

## Run as a desktop app

This repo can also be packaged as a Windows executable using Electron.

1. Install Node.js if you do not already have it.
2. In the `odot-dashboard` folder run:

```powershell
npm install
npm run start
```

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
