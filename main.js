const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// The UI is DOM and <img> only, so GPU acceleration buys nothing and its absence
// is a hard crash on headless hosts, VMs and some RDP sessions.
app.disableHardwareAcceleration();

// Only these files are servable over app://. Without the list the protocol
// handler exposes the whole app directory, including .git during a dev run.
const ALLOWED_APP_FILES = new Set([
  '/index.html',
  '/bundle.js',
  '/app.css',
  '/manifest.webmanifest',
  '/icon.png'
]);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // The renderer only ever shows app:// content; anything else (a camera URL the
  // user edited, an injected link) must not be able to navigate or spawn a window.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://')) {
      event.preventDefault();
      console.warn('[odot] blocked navigation to', url);
    }
  });

  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  mainWindow.loadURL('app://-');
}

app.whenReady().then(() => {
  // protocol.handle() replaces the deprecated registerFileProtocol; it returns a
  // Response rather than writing through a callback, so refusals have to be
  // explicit 403s instead of an error code handed to a callback.
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const pathname = !url.pathname || url.pathname === '/' ? '/index.html' : url.pathname;

    if (!ALLOWED_APP_FILES.has(pathname)) {
      console.warn('[odot] refused app:// request for', pathname);
      return new Response(null, { status: 403, statusText: 'Forbidden' });
    }

    const filePath = path.join(__dirname, pathname);
    if (!filePath.startsWith(__dirname + path.sep)) {
      return new Response(null, { status: 403, statusText: 'Forbidden' });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
