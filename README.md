# ODOT Camera Dashboard + Weather

Interactive single-page app version of your Tampermonkey dashboard:

- ODOT camera tiles with per-camera ALT and a global Alt all
- Fullscreen viewer for any camera (auto-refresh + zoom)
- Weather sidebar (OpenWeather Current Weather)
- Pain/migraine risk + driving risk summaries
- Traffic alerts (OHGO Public API)
- Settings (API keys, coords/geolocation, refresh intervals, camera list)

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
