const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

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
      sandbox: false
    }
  });

  mainWindow.loadURL('app://-');
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = new URL(request.url);
    let pathname = url.pathname;
    if (!pathname || pathname === '/') {
      pathname = '/index.html';
    }

    const filePath = path.join(__dirname, pathname);
    callback({ path: filePath });
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
